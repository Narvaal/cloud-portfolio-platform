resource "aws_apigatewayv2_api" "portfolio" {
  name          = "${var.project_name}-api-${var.environment}"
  protocol_type = "HTTP"
  tags          = local.tags

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "OPTIONS"]
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
