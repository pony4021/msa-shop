# EKS Bootstrap Guide (dev)

## 1. Terraform
```bash
cd infra/eks/terraform
cp terraform.tfvars.example terraform.tfvars
# set db_master_password, tags, etc.
terraform init
terraform plan
terraform apply
```

## 2. Configure kubectl
```bash
aws eks update-kubeconfig --region ap-northeast-2 --name <cluster-name>
kubectl get nodes
```

## 3. Install Istio
```bash
istioctl install -y
kubectl label namespace shop-msa-app istio-injection=enabled --overwrite
```

## 4. Install Argo CD
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

## 5. Install EFS CSI Driver
Use EKS addon or Helm chart, then annotate service account with IRSA role from Terraform output.

## 6. Bootstrap applications
```bash
kubectl apply -n argocd -f argocd/apps/root-app.yaml
```
