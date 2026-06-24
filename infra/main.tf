data "aws_caller_identity" "current" {}

locals {
  bucket_name  = "${var.project_name}-frontend-${data.aws_caller_identity.current.account_id}"
  has_domain   = var.domain_name != ""
  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ── Custom domain: ACM certificate + Route 53 ─────────────────────────────────

data "aws_route53_zone" "main" {
  count = local.has_domain ? 1 : 0
  name  = var.domain_name
}

resource "aws_acm_certificate" "frontend" {
  count                     = local.has_domain ? 1 : 0
  domain_name               = "*.${var.domain_name}"
  subject_alternative_names = [var.domain_name]
  validation_method         = "DNS"
  tags                      = local.tags

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = local.has_domain ? {
    for dvo in aws_acm_certificate.frontend[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main[0].zone_id
}

resource "aws_acm_certificate_validation" "frontend" {
  count                   = local.has_domain ? 1 : 0
  certificate_arn         = aws_acm_certificate.frontend[0].arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

resource "aws_route53_record" "portfolio" {
  count   = local.has_domain ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "portfolio.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  count           = local.has_domain ? 1 : 0
  zone_id         = data.aws_route53_zone.main[0].zone_id
  name            = "www.${var.domain_name}"
  type            = "A"
  allow_overwrite = true

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "root" {
  count           = local.has_domain ? 1 : 0
  zone_id         = data.aws_route53_zone.main[0].zone_id
  name            = var.domain_name
  type            = "A"
  allow_overwrite = true

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

# ── S3 bucket ────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "frontend" {
  bucket = local.bucket_name
  tags   = local.tags
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ── CloudFront Origin Access Control ─────────────────────────────────────────

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.project_name}-frontend-oac-${var.environment}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ── CloudFront distribution ───────────────────────────────────────────────────

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # US, Canada, Europe
  aliases             = local.has_domain ? ["portfolio.${var.domain_name}"] : []
  tags                = local.tags

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "S3-${local.bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  origin {
    domain_name = "${aws_apigatewayv2_api.portfolio.id}.execute-api.${var.aws_region}.amazonaws.com"
    origin_id   = "APIGW"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # /api/* → API Gateway (with CloudFront-Viewer-Country forwarding)
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "APIGW"
    viewer_protocol_policy = "https-only"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled (AWS managed)
    origin_request_policy_id = aws_cloudfront_origin_request_policy.api.id
  }

  default_cache_behavior {
    target_origin_id       = "S3-${local.bucket_name}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id              = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized (AWS managed)
    response_headers_policy_id   = aws_cloudfront_response_headers_policy.security.id
  }

  # SPA routing: return index.html for 403/404 so BrowserRouter works
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = !local.has_domain
    acm_certificate_arn            = local.has_domain ? aws_acm_certificate_validation.frontend[0].certificate_arn : null
    ssl_support_method             = local.has_domain ? "sni-only" : null
    minimum_protocol_version       = local.has_domain ? "TLSv1.2_2021" : "TLSv1"
  }

  depends_on = [aws_acm_certificate_validation.frontend]
}

# ── S3 bucket policy — allow CloudFront OAC ──────────────────────────────────

data "aws_iam_policy_document" "frontend_bucket" {
  statement {
    sid    = "AllowCloudFrontOAC"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.frontend.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.frontend_bucket.json

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}

resource "aws_s3_bucket_cors_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  cors_rule {
    allowed_headers = ["Content-Type", "Content-Disposition", "Cache-Control"]
    allowed_methods = ["PUT"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}

# ── IAM user for GitHub Actions CI/CD ────────────────────────────────────────

resource "aws_iam_user" "github_actions" {
  name = "${var.project_name}-github-actions-${var.environment}"
  tags = local.tags
}

resource "aws_iam_access_key" "github_actions" {
  user = aws_iam_user.github_actions.name
}

data "aws_iam_policy_document" "github_actions" {
  statement {
    sid    = "S3DeployFrontend"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]
    resources = [
      aws_s3_bucket.frontend.arn,
      "${aws_s3_bucket.frontend.arn}/*",
    ]
  }

  statement {
    sid    = "CloudFrontInvalidate"
    effect = "Allow"
    actions = [
      "cloudfront:CreateInvalidation",
    ]
    resources = [aws_cloudfront_distribution.frontend.arn]
  }

  statement {
    sid    = "SSMWriteDeployInfo"
    effect = "Allow"
    actions = [
      "ssm:PutParameter",
    ]
    resources = [
      "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/portfolio/*",
    ]
  }
}

# ── SSM parameters — written by GitHub Actions on each deploy ─────────────────

resource "aws_ssm_parameter" "version" {
  name  = "/portfolio/version"
  type  = "String"
  value = "initial"
  tags  = local.tags
  lifecycle { ignore_changes = [value] }
}

resource "aws_ssm_parameter" "last_deploy" {
  name  = "/portfolio/last-deploy"
  type  = "String"
  value = "1970-01-01T00:00:00Z"
  tags  = local.tags
  lifecycle { ignore_changes = [value] }
}

resource "aws_ssm_parameter" "last_commit_sha" {
  name  = "/portfolio/last-commit-sha"
  type  = "String"
  value = "initial"
  tags  = local.tags
  lifecycle { ignore_changes = [value] }
}

resource "aws_ssm_parameter" "last_commit_message" {
  name  = "/portfolio/last-commit-message"
  type  = "String"
  value = "initial"
  tags  = local.tags
  lifecycle { ignore_changes = [value] }
}

resource "aws_iam_user_policy" "github_actions" {
  name   = "${var.project_name}-github-actions-policy-${var.environment}"
  user   = aws_iam_user.github_actions.name
  policy = data.aws_iam_policy_document.github_actions.json
}

# ── CloudFront security headers ───────────────────────────────────────────────

resource "aws_cloudfront_response_headers_policy" "security" {
  name = "${var.project_name}-security-headers-${var.environment}"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }
}

# ── SSM: admin password (SecureString — set value manually after apply) ───────

resource "aws_ssm_parameter" "admin_secret" {
  name  = "/portfolio/admin-secret"
  type  = "SecureString"
  value = "changeme"
  tags  = local.tags
  lifecycle { ignore_changes = [value] }
}
