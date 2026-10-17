variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming and tagging"
  type        = string
  default     = "cloud-portfolio"
}

variable "contact_email" {
  description = "Email address for receiving contact form submissions — must be verified in SES"
  type        = string
}

variable "domain_name" {
  description = "Root domain name for the portfolio (e.g. example.com). www. is added automatically."
  type        = string
  default     = ""
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["prod", "staging", "dev"], var.environment)
    error_message = "environment must be prod, staging, or dev."
  }
}

variable "github_repository" {
  description = "GitHub repository (owner/name) allowed to assume the deploy role via OIDC"
  type        = string
  default     = "Narvaal/cloud-portfolio-platform"
}

variable "github_deploy_branch" {
  description = "Only workflows running on this branch can assume the deploy role"
  type        = string
  default     = "production"
}

variable "github_username" {
  description = "GitHub user whose public activity is shown on the portfolio"
  type        = string
  default     = "Narvaal"
}
