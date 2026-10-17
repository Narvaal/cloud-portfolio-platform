locals {
  contact_domain = split("@", var.contact_email)[1]
}

# Verified via Easy DKIM CNAMEs (region-specific tokens), so it never touches the
# shared _amazonses TXT record that other regions' identities depend on
resource "aws_sesv2_email_identity" "contact" {
  email_identity = local.contact_domain
  tags           = local.tags
}

resource "aws_route53_record" "ses_dkim" {
  count   = local.has_domain ? 3 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "${aws_sesv2_email_identity.contact.dkim_signing_attributes[0].tokens[count.index]}._domainkey.${local.contact_domain}"
  type    = "CNAME"
  ttl     = 1800
  records = ["${aws_sesv2_email_identity.contact.dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"]
}

resource "aws_iam_role_policy" "lambda_ses_send" {
  name = "${var.project_name}-lambda-ses-send-${var.environment}"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["ses:SendEmail"]
      Resource = [
        aws_sesv2_email_identity.contact.arn,
        "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:identity/*@${local.contact_domain}",
        "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:configuration-set/*",
      ]
    }]
  })
}
