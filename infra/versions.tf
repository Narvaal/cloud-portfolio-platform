terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # State bucket is bootstrapped outside Terraform (versioned, encrypted, private, TLS-only)
  backend "s3" {
    bucket       = "cloud-portfolio-tf-state-356892335394"
    key          = "portfolio/terraform.tfstate"
    region       = "sa-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.aws_region
}
