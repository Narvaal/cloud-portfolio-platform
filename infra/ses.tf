resource "aws_ses_domain_identity" "contact" {
  domain = split("@", var.contact_email)[1]
}

resource "aws_iam_role_policy" "lambda_ses_send" {
  name = "${var.project_name}-lambda-ses-send-${var.environment}"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ses:SendEmail"]
      Resource = [
        aws_ses_domain_identity.contact.arn,
        "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:identity/*@${aws_ses_domain_identity.contact.domain}",
        "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:configuration-set/*",
      ]
    }]
  })
}
