data "archive_file" "status_lambda" {
  type        = "zip"
  output_path = "${path.module}/.build/status.zip"
  source {
    content  = file("${path.module}/../backend/functions/status/index.mjs")
    filename = "index.mjs"
  }
}

data "archive_file" "visitors_lambda" {
  type        = "zip"
  output_path = "${path.module}/.build/visitors.zip"
  source {
    content  = file("${path.module}/../backend/functions/visitors/index.mjs")
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

resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "${var.project_name}-lambda-dynamodb-${var.environment}"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:UpdateItem", "dynamodb:Scan"]
        Resource = aws_dynamodb_table.visitors.arn
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:PutItem", "dynamodb:Scan", "dynamodb:UpdateItem"]
        Resource = aws_dynamodb_table.contacts.arn
      },
    ]
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

data "archive_file" "contact_lambda" {
  type        = "zip"
  output_path = "${path.module}/.build/contact.zip"
  source {
    content  = file("${path.module}/../backend/functions/contact/index.mjs")
    filename = "index.mjs"
  }
}

resource "aws_lambda_function" "contact" {
  function_name    = "${var.project_name}-contact-${var.environment}"
  filename         = data.archive_file.contact_lambda.output_path
  source_code_hash = data.archive_file.contact_lambda.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda_exec.arn
  timeout          = 15
  tags             = local.tags

  environment {
    variables = {
      CONTACT_EMAIL  = var.contact_email
      CONTACTS_TABLE = aws_dynamodb_table.contacts.name
    }
  }
}

data "archive_file" "contacts_lambda" {
  type        = "zip"
  output_path = "${path.module}/.build/contacts.zip"
  source {
    content  = file("${path.module}/../backend/functions/contacts/index.mjs")
    filename = "index.mjs"
  }
}

data "archive_file" "contacts_patch_lambda" {
  type        = "zip"
  output_path = "${path.module}/.build/contacts-patch.zip"
  source {
    content  = file("${path.module}/../backend/functions/contacts-patch/index.mjs")
    filename = "index.mjs"
  }
}

data "archive_file" "settings_lambda" {
  type        = "zip"
  output_path = "${path.module}/.build/settings.zip"
  source {
    content  = file("${path.module}/../backend/functions/settings/index.mjs")
    filename = "index.mjs"
  }
}

resource "aws_iam_role_policy" "lambda_settings" {
  name = "${var.project_name}-lambda-settings-${var.environment}"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:Scan", "dynamodb:UpdateItem"]
      Resource = aws_dynamodb_table.settings.arn
    }]
  })
}

resource "aws_lambda_function" "settings" {
  function_name    = "${var.project_name}-settings-${var.environment}"
  filename         = data.archive_file.settings_lambda.output_path
  source_code_hash = data.archive_file.settings_lambda.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda_exec.arn
  timeout          = 10
  tags             = local.tags

  environment {
    variables = {
      SETTINGS_TABLE = aws_dynamodb_table.settings.name
    }
  }
}

data "archive_file" "resume_lambda" {
  type        = "zip"
  output_path = "${path.module}/.build/resume.zip"
  source {
    content  = file("${path.module}/../backend/functions/resume/index.mjs")
    filename = "index.mjs"
  }
}

resource "aws_iam_role_policy" "lambda_resume" {
  name = "${var.project_name}-lambda-resume-${var.environment}"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "${aws_s3_bucket.frontend.arn}/resume/*"
      },
      {
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation"]
        Resource = aws_cloudfront_distribution.frontend.arn
      },
    ]
  })
}

resource "aws_lambda_function" "resume" {
  function_name    = "${var.project_name}-resume-${var.environment}"
  filename         = data.archive_file.resume_lambda.output_path
  source_code_hash = data.archive_file.resume_lambda.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda_exec.arn
  timeout          = 15
  tags             = local.tags

  environment {
    variables = {
      S3_BUCKET                  = aws_s3_bucket.frontend.id
      CLOUDFRONT_DISTRIBUTION_ID = aws_cloudfront_distribution.frontend.id
    }
  }
}

resource "aws_lambda_function" "contacts_patch" {
  function_name    = "${var.project_name}-contacts-patch-${var.environment}"
  filename         = data.archive_file.contacts_patch_lambda.output_path
  source_code_hash = data.archive_file.contacts_patch_lambda.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda_exec.arn
  timeout          = 10
  tags             = local.tags

  environment {
    variables = {
      CONTACTS_TABLE = aws_dynamodb_table.contacts.name
    }
  }
}

resource "aws_lambda_function" "contacts_get" {
  function_name    = "${var.project_name}-contacts-get-${var.environment}"
  filename         = data.archive_file.contacts_lambda.output_path
  source_code_hash = data.archive_file.contacts_lambda.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda_exec.arn
  timeout          = 10
  tags             = local.tags

  environment {
    variables = {
      CONTACTS_TABLE = aws_dynamodb_table.contacts.name
    }
  }
}

resource "aws_lambda_function" "visitors" {
  function_name    = "${var.project_name}-visitors-${var.environment}"
  filename         = data.archive_file.visitors_lambda.output_path
  source_code_hash = data.archive_file.visitors_lambda.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda_exec.arn
  timeout          = 10
  tags             = local.tags

  environment {
    variables = {
      VISITORS_TABLE = aws_dynamodb_table.visitors.name
    }
  }
}

data "archive_file" "content_lambda" {
  type        = "zip"
  output_path = "${path.module}/.build/content.zip"
  source {
    content  = file("${path.module}/../backend/functions/content/index.mjs")
    filename = "index.mjs"
  }
}

resource "aws_iam_role_policy" "lambda_content" {
  name = "${var.project_name}-lambda-content-${var.environment}"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:Scan", "dynamodb:PutItem"]
      Resource = aws_dynamodb_table.content.arn
    }]
  })
}

resource "aws_lambda_function" "content" {
  function_name    = "${var.project_name}-content-${var.environment}"
  filename         = data.archive_file.content_lambda.output_path
  source_code_hash = data.archive_file.content_lambda.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda_exec.arn
  timeout          = 10
  tags             = local.tags

  environment {
    variables = {
      CONTENT_TABLE = aws_dynamodb_table.content.name
    }
  }
}
