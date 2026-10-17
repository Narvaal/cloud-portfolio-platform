output "cloudfront_domain_name" {
  description = "CloudFront distribution domain — use this as your site URL"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID — also published to SSM /portfolio/config/cloudfront-distribution-id"
  value       = aws_cloudfront_distribution.frontend.id
}

output "s3_bucket_name" {
  description = "S3 bucket name — also published to SSM /portfolio/config/s3-bucket"
  value       = aws_s3_bucket.frontend.id
}

output "api_gateway_url" {
  description = "API Gateway base URL (frontend uses the CloudFront /api path from SSM /portfolio/config/api-base-url)"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "github_actions_role_arn" {
  description = "IAM role assumed by GitHub Actions via OIDC — set as GitHub repo variable AWS_ROLE_ARN"
  value       = aws_iam_role.github_actions.arn
}
