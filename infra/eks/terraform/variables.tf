variable "project_name" {
  description = "Project name prefix for all resources"
  type        = string
  default     = "shop-msa"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-2"
}

variable "vpc_cidr" {
  description = "VPC CIDR"
  type        = string
  default     = "10.30.0.0/16"
}

variable "cluster_version" {
  description = "EKS cluster version"
  type        = string
  default     = "1.30"
}

variable "node_instance_types" {
  description = "Managed node group instance types"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_desired_size" {
  description = "Desired node count"
  type        = number
  default     = 2
}

variable "node_min_size" {
  description = "Min node count"
  type        = number
  default     = 2
}

variable "node_max_size" {
  description = "Max node count"
  type        = number
  default     = 3
}

variable "db_master_username" {
  description = "RDS master username"
  type        = string
  default     = "shopmsa"
}

variable "db_master_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "db_multi_az" {
  description = "Enable RDS Multi-AZ. Recommended true for prod"
  type        = bool
  default     = false
}

variable "enable_alb_controller" {
  description = "Install IAM role resources for AWS Load Balancer Controller"
  type        = bool
  default     = false
}

variable "enable_istio" {
  description = "Whether Istio is used on the cluster"
  type        = bool
  default     = true
}

variable "enable_efs" {
  description = "Whether EFS resources should be provisioned"
  type        = bool
  default     = true
}

variable "enable_external_dns" {
  description = "Whether external-dns platform component is enabled"
  type        = bool
  default     = false
}

variable "enable_cert_manager" {
  description = "Whether cert-manager platform component is enabled"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Common tags"
  type        = map(string)
  default = {
    owner      = "platform"
    managed-by = "terraform"
    project    = "shop-msa"
  }
}
