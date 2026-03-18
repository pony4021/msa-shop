output "region" {
  value = var.region
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "oidc_arn" {
  value = module.eks.oidc_provider_arn
}

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "private_subnets" {
  value = module.vpc.private_subnets
}

output "rds_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "efs_id" {
  value = try(aws_efs_file_system.shop_msa[0].id, null)
}

output "efs_csi_irsa_role_arn" {
  value = try(aws_iam_role.efs_csi_irsa[0].arn, null)
}

output "lb_controller_irsa_role_arn" {
  value = try(module.lb_controller_irsa_role[0].iam_role_arn, null)
}

output "ecr_repositories" {
  value = {
    for name, repo in aws_ecr_repository.services :
    name => repo.repository_url
  }
}

output "configure_kubectl_command" {
  value = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name}"
}

output "db_init_sql" {
  description = "Run this SQL once against RDS master DB to initialize service databases"
  value       = join("\n", [for db in local.app_databases : "CREATE DATABASE ${db};"])
}
