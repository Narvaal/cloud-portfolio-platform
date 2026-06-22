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
