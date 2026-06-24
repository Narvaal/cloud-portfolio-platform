# ── CloudFront Function: strip /api prefix before forwarding to API Gateway ───

resource "aws_cloudfront_function" "api_rewrite" {
  name    = "${var.project_name}-api-rewrite-${var.environment}"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var request = event.request;
      request.uri = request.uri.replace(/^\/api/, '') || '/';
      return request;
    }
  EOT
}

# ── Origin request policy: forward CloudFront-Viewer-Country to Lambda ────────

resource "aws_cloudfront_origin_request_policy" "api" {
  name = "${var.project_name}-api-geo-${var.environment}"

  headers_config {
    header_behavior = "whitelist"
    headers {
      items = ["CloudFront-Viewer-Country", "Authorization"]
    }
  }

  query_strings_config {
    query_string_behavior = "all"
  }

  cookies_config {
    cookie_behavior = "none"
  }
}
