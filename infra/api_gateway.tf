resource "aws_apigatewayv2_api" "portfolio" {
  name          = "${var.project_name}-api-${var.environment}"
  protocol_type = "HTTP"
  tags          = local.tags

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PATCH", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.portfolio.id
  name        = "$default"
  auto_deploy = true
  tags        = local.tags
}

resource "aws_apigatewayv2_integration" "status" {
  api_id                 = aws_apigatewayv2_api.portfolio.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.status.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "status" {
  api_id    = aws_apigatewayv2_api.portfolio.id
  route_key = "GET /status"
  target    = "integrations/${aws_apigatewayv2_integration.status.id}"
}

resource "aws_lambda_permission" "api_gw_status" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.status.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.portfolio.execution_arn}/*/*"
}

# ── Contact ───────────────────────────────────────────────────────────────────

resource "aws_apigatewayv2_integration" "contact" {
  api_id                 = aws_apigatewayv2_api.portfolio.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.contact.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "contact" {
  api_id    = aws_apigatewayv2_api.portfolio.id
  route_key = "POST /contact"
  target    = "integrations/${aws_apigatewayv2_integration.contact.id}"
}

resource "aws_lambda_permission" "api_gw_contact" {
  statement_id  = "AllowAPIGatewayInvokeContact"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.contact.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.portfolio.execution_arn}/*/*"
}

# ── Visitors ──────────────────────────────────────────────────────────────────

resource "aws_apigatewayv2_integration" "visitors" {
  api_id                 = aws_apigatewayv2_api.portfolio.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.visitors.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "visitors_post" {
  api_id    = aws_apigatewayv2_api.portfolio.id
  route_key = "POST /visitors"
  target    = "integrations/${aws_apigatewayv2_integration.visitors.id}"
}

resource "aws_apigatewayv2_route" "visitors_get" {
  api_id    = aws_apigatewayv2_api.portfolio.id
  route_key = "GET /visitors"
  target    = "integrations/${aws_apigatewayv2_integration.visitors.id}"
}

resource "aws_lambda_permission" "api_gw_visitors" {
  statement_id  = "AllowAPIGatewayInvokeVisitors"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.visitors.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.portfolio.execution_arn}/*/*"
}

# ── Settings ─────────────────────────────────────────────────────────────────

resource "aws_apigatewayv2_integration" "settings" {
  api_id                 = aws_apigatewayv2_api.portfolio.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.settings.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "settings_get" {
  api_id    = aws_apigatewayv2_api.portfolio.id
  route_key = "GET /settings"
  target    = "integrations/${aws_apigatewayv2_integration.settings.id}"
}

resource "aws_apigatewayv2_route" "settings_patch" {
  api_id    = aws_apigatewayv2_api.portfolio.id
  route_key = "PATCH /settings/{key}"
  target    = "integrations/${aws_apigatewayv2_integration.settings.id}"
}

resource "aws_lambda_permission" "api_gw_settings" {
  statement_id  = "AllowAPIGatewayInvokeSettings"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.settings.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.portfolio.execution_arn}/*/*"
}

# ── Resume (presigned upload + CloudFront invalidation) ──────────────────────

resource "aws_apigatewayv2_integration" "resume" {
  api_id                 = aws_apigatewayv2_api.portfolio.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.resume.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "resume_presign" {
  api_id    = aws_apigatewayv2_api.portfolio.id
  route_key = "GET /resume/presign"
  target    = "integrations/${aws_apigatewayv2_integration.resume.id}"
}

resource "aws_apigatewayv2_route" "resume_publish" {
  api_id    = aws_apigatewayv2_api.portfolio.id
  route_key = "POST /resume/publish"
  target    = "integrations/${aws_apigatewayv2_integration.resume.id}"
}

resource "aws_lambda_permission" "api_gw_resume" {
  statement_id  = "AllowAPIGatewayInvokeResume"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.resume.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.portfolio.execution_arn}/*/*"
}

# ── Contacts (admin read + mark-as-read) ─────────────────────────────────────

resource "aws_apigatewayv2_integration" "contacts_get" {
  api_id                 = aws_apigatewayv2_api.portfolio.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.contacts_get.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "contacts_get" {
  api_id    = aws_apigatewayv2_api.portfolio.id
  route_key = "GET /contacts"
  target    = "integrations/${aws_apigatewayv2_integration.contacts_get.id}"
}

resource "aws_lambda_permission" "api_gw_contacts_get" {
  statement_id  = "AllowAPIGatewayInvokeContactsGet"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.contacts_get.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.portfolio.execution_arn}/*/*"
}

resource "aws_apigatewayv2_integration" "contacts_patch" {
  api_id                 = aws_apigatewayv2_api.portfolio.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.contacts_patch.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "contacts_patch" {
  api_id    = aws_apigatewayv2_api.portfolio.id
  route_key = "PATCH /contacts/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.contacts_patch.id}"
}

resource "aws_lambda_permission" "api_gw_contacts_patch" {
  statement_id  = "AllowAPIGatewayInvokeContactsPatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.contacts_patch.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.portfolio.execution_arn}/*/*"
}
