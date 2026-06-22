terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment after creating the state bucket manually:
  # backend "s3" {
  #   bucket         = "cloud-portfolio-tf-state-<account-id>"
  #   key            = "frontend/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "cloud-portfolio-tf-locks"
  # }
}

provider "aws" {
  region = var.aws_region
}
