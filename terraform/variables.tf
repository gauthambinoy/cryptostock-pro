variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "github_repo_url" {
  description = "GitHub repository URL"
  type        = string
  default     = "https://github.com/gauthambinoy/cryptostock-pro.git"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "newsapi_key" {
  description = "NewsAPI key"
  type        = string
  default     = "test"
}

variable "fred_api_key" {
  description = "FRED API key"
  type        = string
  default     = "test"
}

variable "jwt_secret_key" {
  description = "JWT secret key"
  type        = string
  default     = "assetpulse-secret-key-change-in-production"
}
