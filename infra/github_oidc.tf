# ── GitHub Actions OIDC — short-lived credentials, no static keys ─────────────

# The provider is account-wide and shared with other projects — reference it, never own it
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "github_actions_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Only workflows running on the deploy branch of this repo can assume the role
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:ref:refs/heads/${var.github_deploy_branch}"]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name                 = "${var.project_name}-github-actions-${var.environment}"
  assume_role_policy   = data.aws_iam_policy_document.github_actions_assume.json
  max_session_duration = 3600
  tags                 = local.tags
}

resource "aws_iam_role_policy" "github_actions" {
  name   = "${var.project_name}-github-actions-policy-${var.environment}"
  role   = aws_iam_role.github_actions.id
  policy = data.aws_iam_policy_document.github_actions.json
}

# ── SSM: non-secret deploy config, read by GitHub Actions ─────────────────────

resource "aws_ssm_parameter" "config_s3_bucket" {
  name  = "/portfolio/config/s3-bucket"
  type  = "String"
  value = aws_s3_bucket.frontend.id
  tags  = local.tags
}

resource "aws_ssm_parameter" "config_cloudfront_distribution_id" {
  name  = "/portfolio/config/cloudfront-distribution-id"
  type  = "String"
  value = aws_cloudfront_distribution.frontend.id
  tags  = local.tags
}

resource "aws_ssm_parameter" "config_api_base_url" {
  name  = "/portfolio/config/api-base-url"
  type  = "String"
  value = local.has_domain ? "https://portfolio.${var.domain_name}/api" : "https://${aws_cloudfront_distribution.frontend.domain_name}/api"
  tags  = local.tags
}
