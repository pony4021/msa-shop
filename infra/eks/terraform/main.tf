locals {
  name = "${var.project_name}-${var.environment}"

  azs = [
    "${var.region}a",
    "${var.region}b",
    "${var.region}c"
  ]

  common_tags = merge(var.tags, {
    project     = var.project_name
    environment = var.environment
  })

  app_databases = [
    "userdb",
    "productdb",
    "orderdb",
    "inventorydb",
    "paymentdb",
    "paymenteventdb"
  ]
}

provider "aws" {
  region = var.region

  default_tags {
    tags = local.common_tags
  }
}

data "aws_caller_identity" "current" {}

data "aws_iam_policy" "efs_csi" {
  arn = "arn:aws:iam::aws:policy/service-role/AmazonEFSCSIDriverPolicy"
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.8"

  name = "${local.name}-vpc"
  cidr = var.vpc_cidr

  azs             = local.azs
  private_subnets = ["10.30.1.0/24", "10.30.2.0/24", "10.30.3.0/24"]
  public_subnets  = ["10.30.101.0/24", "10.30.102.0/24", "10.30.103.0/24"]

  enable_nat_gateway     = true
  one_nat_gateway_per_az = true
  enable_dns_hostnames   = true
  enable_dns_support     = true

  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }

  tags = local.common_tags
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.15"

  cluster_name    = "${local.name}-eks"
  cluster_version = var.cluster_version

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  enable_irsa = true

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    default = {
      instance_types = var.node_instance_types
      desired_size   = var.node_desired_size
      min_size       = var.node_min_size
      max_size       = var.node_max_size
      capacity_type  = "ON_DEMAND"
      labels = {
        workload = "general"
      }
    }
  }

  tags = local.common_tags
}

resource "aws_security_group" "rds" {
  name        = "${local.name}-rds-sg"
  description = "RDS access from EKS nodes"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
    description     = "PostgreSQL from EKS nodes"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags
}

resource "aws_db_subnet_group" "shop_msa" {
  name       = "${local.name}-db-subnet-group"
  subnet_ids = module.vpc.private_subnets

  tags = local.common_tags
}

resource "aws_db_instance" "postgres" {
  identifier              = "${replace(local.name, "_", "-")}-postgres"
  engine                  = "postgres"
  engine_version          = "16.3"
  instance_class          = "db.t4g.medium"
  allocated_storage       = 100
  max_allocated_storage   = 500
  storage_type            = "gp3"
  username                = var.db_master_username
  password                = var.db_master_password
  db_subnet_group_name    = aws_db_subnet_group.shop_msa.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  multi_az                = var.db_multi_az
  publicly_accessible     = false
  skip_final_snapshot     = true
  deletion_protection     = false
  backup_retention_period = 7
  port                    = 5432

  tags = local.common_tags
}

resource "aws_security_group" "efs" {
  count       = var.enable_efs ? 1 : 0
  name        = "${local.name}-efs-sg"
  description = "EFS access from EKS nodes"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
    description     = "NFS from EKS nodes"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags
}

resource "aws_efs_file_system" "shop_msa" {
  count           = var.enable_efs ? 1 : 0
  creation_token  = "${local.name}-efs"
  encrypted       = true
  throughput_mode = "bursting"

  tags = merge(local.common_tags, {
    Name = "${local.name}-efs"
  })
}

resource "aws_efs_mount_target" "shop_msa" {
  count           = var.enable_efs ? length(module.vpc.private_subnets) : 0
  file_system_id  = aws_efs_file_system.shop_msa[0].id
  subnet_id       = module.vpc.private_subnets[count.index]
  security_groups = [aws_security_group.efs[0].id]
}

resource "aws_ecr_repository" "services" {
  for_each = toset([
    "frontend",
    "frontend-admin",
    "user-service",
    "product-service",
    "order-service",
    "inventory-service",
    "payment-service",
    "payment-event-service"
  ])

  name                 = "${var.project_name}/${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = local.common_tags
}

module "lb_controller_irsa_role" {
  count   = var.enable_alb_controller ? 1 : 0
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.41"

  role_name = "${local.name}-aws-lb-controller"

  attach_load_balancer_controller_policy = true

  oidc_providers = {
    eks = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:aws-load-balancer-controller"]
    }
  }

  tags = local.common_tags
}

resource "aws_iam_role" "efs_csi_irsa" {
  count = var.enable_efs ? 1 : 0

  name = "${local.name}-efs-csi-irsa"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = module.eks.oidc_provider_arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${replace(module.eks.cluster_oidc_issuer_url, "https://", "")}:sub" = "system:serviceaccount:kube-system:efs-csi-controller-sa"
          "${replace(module.eks.cluster_oidc_issuer_url, "https://", "")}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "efs_csi_irsa_attachment" {
  count      = var.enable_efs ? 1 : 0
  role       = aws_iam_role.efs_csi_irsa[0].name
  policy_arn = data.aws_iam_policy.efs_csi.arn
}
