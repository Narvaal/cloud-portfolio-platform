output "cloudfront_domain_name" {
  description = "CloudFront distribution domain — use this as your site URL"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID — add to GitHub secret CLOUDFRONT_DISTRIBUTION_ID"
  value       = aws_cloudfront_distribution.frontend.id
}

output "s3_bucket_name" {
  description = "S3 bucket name — add to GitHub secret S3_BUCKET"
  value       = aws_s3_bucket.frontend.id
}

output "github_actions_access_key_id" {
  description = "IAM access key ID — add to GitHub secret AWS_ACCESS_KEY_ID"
  value       = aws_iam_access_key.github_actions.id
}

output "github_actions_secret_access_key" {
  description = "IAM secret key — add to GitHub secret AWS_SECRET_ACCESS_KEY"
  value       = aws_iam_access_key.github_actions.secret
  sensitive   = true
}
