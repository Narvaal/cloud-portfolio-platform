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
