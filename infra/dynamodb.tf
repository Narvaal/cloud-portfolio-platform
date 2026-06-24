resource "aws_dynamodb_table" "content" {
  name         = "${var.project_name}-content-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "type"
  range_key    = "lang"

  attribute {
    name = "type"
    type = "S"
  }

  attribute {
    name = "lang"
    type = "S"
  }

  tags = local.tags
}

resource "aws_dynamodb_table" "settings" {
  name         = "${var.project_name}-settings-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "key"

  attribute {
    name = "key"
    type = "S"
  }

  tags = local.tags
}

resource "aws_dynamodb_table" "contacts" {
  name         = "${var.project_name}-contacts-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = local.tags
}

resource "aws_dynamodb_table" "visitors" {
  name         = "${var.project_name}-visitors-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"

  attribute {
    name = "pk"
    type = "S"
  }

  tags = local.tags
}

resource "aws_dynamodb_table" "rate_limit" {
  name         = "${var.project_name}-rate-limit-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"

  attribute {
    name = "pk"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = local.tags
}

resource "aws_dynamodb_table" "admin_sessions" {
  name         = "${var.project_name}-admin-sessions-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "token"

  attribute {
    name = "token"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = local.tags
}
