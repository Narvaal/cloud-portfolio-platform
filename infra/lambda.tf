data "archive_file" "status_lambda" {
  type        = "zip"
  output_path = "${path.module}/.build/status.zip"
  source {
    content  = file("${path.module}/../backend/functions/status/index.mjs")
    filename = "index.mjs"
  }
}

resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-lambda-exec-${var.environment}"
  tags = local.tags

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_ssm_read" {
  name = "${var.project_name}-lambda-ssm-read-${var.environment}"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ssm:GetParameters"]
      Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/portfolio/*"
    }]
  })
}

resource "aws_lambda_function" "status" {
  function_name    = "${var.project_name}-status-${var.environment}"
  filename         = data.archive_file.status_lambda.output_path
  source_code_hash = data.archive_file.status_lambda.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda_exec.arn
  timeout          = 10
  tags             = local.tags
}
