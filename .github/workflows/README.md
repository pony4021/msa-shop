# GitHub Actions Workflows

## Required Repository Secrets
- `AWS_ROLE_TO_ASSUME`: IAM role ARN for GitHub OIDC

## Required Repository Variables
- `AWS_REGION`: e.g. `ap-northeast-2`
- `ECR_REGISTRY`: e.g. `<account-id>.dkr.ecr.ap-northeast-2.amazonaws.com`

## Optional Variables/Secrets
- `ARGOCD_SERVER`
- `ARGOCD_AUTH_TOKEN`

## Workflows
1. `build-push-ecr.yml`
- Builds all 8 services
- Pushes images to ECR
- Tags:
  - `${GITHUB_SHA::12}`
  - `release-YYYYMMDD`

2. `update-manifest.yml`
- Updates `k8s/overlays/dev/kustomization.yaml` image tags
- Creates PR for GitOps sync

## Notes
- Replace placeholder ECR image names in k8s manifests with your actual account ID/registry.
- Argo CD should watch `main` branch to apply merged manifest updates.
