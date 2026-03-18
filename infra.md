# Shop MSA EKS/Istio 배포 가이드 (실행 순서 + 수정 파일 + 추가 구성)

이 문서는 **현재 레포 상태 기준**으로 dev 환경을 실제 배포하기 위한 상세 가이드입니다.

도메인 정책(확정):
1. 개발: `dev-shop.wookja.cloud`
2. 운영: `shop.wookjin.cloud`
3. DNS: Route53 사용 (네임서버 Route53로 변경 완료)

## 1. 목표 아키텍처
1. EKS + Istio IngressGateway(NLB)
2. CI/CD: GitHub Actions + ECR + Argo CD(GitOps)
3. Terraform으로 VPC/EKS/RDS/EFS/ECR/IRSA 생성
4. 스토리지 정책
- Redis: EFS
- Kafka: EBS(gp3)

## 2. 사전 준비
1. 로컬 툴 설치
- AWS CLI v2
- kubectl
- terraform >= 1.6
- istioctl
- docker
2. AWS 권한
- EKS/VPC/IAM/RDS/EFS/ECR 생성 가능한 IAM 권한
3. GitHub 저장소
- 현재 저장소: `https://github.com/wookja-0/msa-shop.git`

### 2.1 Terraform 실행 전 사전 생성/확인 항목 (중요)
1. Route53 Hosted Zone 확인
- `wookja.cloud`, `wookjin.cloud` Hosted Zone 존재 확인
- NS가 Route53으로 위임된 상태인지 최종 확인

2. (권장) Terraform Remote State 저장소
- S3 버킷 1개 생성 (예: `shop-msa-tfstate-<account-id>`)
- DynamoDB 테이블 1개 생성 (Lock 용도, PK: `LockID`)
- 팀 작업 시 로컬 state 대신 반드시 원격 state 사용 권장

3. ACM 인증서
- dev용: `dev-shop.wookja.cloud`
- prod용: `shop.wookjin.cloud`
- 리전: EKS/NLB와 동일 리전(`ap-northeast-2`)에 발급
- 검증 방식: DNS(Route53) 권장

4. GitHub Actions용 OIDC/IAM Role 준비
- GitHub에서 AWS AssumeRole 할 IAM Role 신뢰정책 준비
- 최소 권한: ECR push, (필요 시) EKS 배포/조회 권한
- GitHub Secrets/Variables:
  - `AWS_ROLE_TO_ASSUME`
  - `AWS_REGION`
  - `ECR_REGISTRY`

5. ECR 로그인/권한 사전 점검
- Terraform이 ECR repo를 생성하므로, apply 이후 push 권한 테스트 권장

6. (선택) Argo CD 외부 노출 시 인증서 정책 결정
- 현재 `argocd-values.yaml`은 ALB Ingress 사용
- HTTPS 강제 시 ALB용 ACM 인증서 ARN annotation 적용 필요

## 3. 배포 전체 순서 (요약)
1. Terraform 값 치환 후 인프라 생성
2. kubeconfig 연결
3. Istio 설치
4. Argo CD 설치
5. EFS CSI 드라이버 설치(IRSA 연결)
6. k8s overlay(dev) 값 치환
7. kustomize 검증
8. Argo CD app 적용
9. 기능/이벤트(E2E) 검증
10. GitHub Actions 활성화 및 이미지 자동 반영 확인

---

## 4. 1단계: Terraform 인프라 생성

### 4.1 수정 파일
1. `infra/eks/terraform/terraform.tfvars` 생성
- `terraform.tfvars.example` 복사 후 사용

### 4.2 필수 수정값
1. `db_master_password`
2. 필요 시 `db_multi_az` (dev는 false 권장)
3. 태그 정보

### 4.2.1 dev EKS 노드 수(현재 기본값)
1. 노드 그룹: 1개 (`default`)
2. 인스턴스 타입: `t3.medium`
3. 초기 생성(Desired): **2대**
4. 최소(Min): 2대
5. 최대(Max): 3대
- 따라서 Terraform apply 직후에는 보통 워커 노드 2대가 생성되고, 부하 시 최대 3대까지 증가합니다.

### 4.3 실행 명령
```bash
cd infra/eks/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

### 4.4 Terraform output으로 확보할 값
1. `cluster_name`
2. `rds_endpoint`
3. `efs_id`
4. `ecr_repositories`
5. `configure_kubectl_command`
6. `efs_csi_irsa_role_arn`

---

## 5. 2단계: 클러스터 부트스트랩

### 5.1 kubeconfig 연결
```bash
aws eks update-kubeconfig --region ap-northeast-2 --name <cluster_name>
kubectl get nodes
```

### 5.2 Istio 설치
```bash
istioctl install -y
kubectl label namespace shop-msa-app istio-injection=enabled --overwrite
```

### 5.3 Argo CD 설치
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### 5.4 EFS CSI 설치
1. EKS Addon 또는 Helm으로 설치
2. `kube-system/efs-csi-controller-sa` 서비스어카운트에 `efs_csi_irsa_role_arn` 연결

---

## 6. 3단계: 값 치환 체크리스트 (실제 적용용)

### 6.1 GitHub repo URL
1. `argocd/apps/root-app.yaml:9`
2. `argocd/apps/platform-app.yaml:9`
3. `argocd/apps/shop-msa-dev-app.yaml:9`
4. `argocd/apps/observability-prometheus-app.yaml:17`
5. `argocd/apps/observability-kiali-app.yaml:16`
- `https://github.com/REPLACE_ME/shop-msa.git` -> `https://github.com/wookja-0/msa-shop.git`

### 6.2 AWS Account / ECR
1. `k8s/base/apps/*.yaml` 이미지 8개
2. `k8s/overlays/dev/kustomization.yaml` 이미지 8개
- `<aws_account_id>` -> 실제 Account ID

### 6.3 dev 이미지 태그
1. `k8s/overlays/dev/kustomization.yaml`
- `dev-<gitsha>` -> 실제 태그 (예: `dev-f3e5c79`)

### 6.4 도메인(host)
1. `k8s/base/infra/istio-gateway.yaml`
2. `k8s/base/infra/istio-virtualservice.yaml`
3. `k8s/base/infra/app-configmap.yaml`
4. `k8s/overlays/dev/patch-istio-host-dev.yaml`
- dev는 `dev-shop.wookja.cloud` 사용
- prod는 `shop.wookjin.cloud` 사용 (`k8s/overlays/prod/patch-istio-host-prod.yaml`)

### 6.5 EFS ID
1. `k8s/overlays/dev/patch-storageclass-efs-dev.yaml:6`
- `fs-REPLACE_ME` -> Terraform output `efs_id`

### 6.6 RDS Endpoint/비밀번호/JWT
1. `k8s/overlays/dev/patch-secrets-dev.yaml`
- `dev-rds-endpoint` -> `rds_endpoint`
- `DEV_DB_PASSWORD` -> 실제 값
- `DEV_CHANGE_ME_JWT_SECRET` -> 실제 JWT 시크릿
- `DEV_CHANGE_ME_INTERNAL_SECRET` -> 실제 내부 호출 시크릿

### 6.7 (선택) 플랫폼 Helm values ARN
1. `infra/platform/helm-values/aws-load-balancer-controller-values.yaml`
2. `infra/platform/helm-values/external-dns-values.yaml`
- `<account-id>` 치환

### 6.8 관측(Observability) 값 파일
1. `infra/platform/helm-values/kube-prometheus-stack-values.yaml`
2. `infra/platform/helm-values/kiali-server-values.yaml`
- dev 기준 URL:
  - Grafana: `https://dev-shop.wookja.cloud/grafana`
  - Kiali: `https://dev-shop.wookja.cloud/kiali`

---

## 7. 4단계: K8s/ArgoCD 배포

### 7.1 정적 검증
```bash
terraform -chdir=infra/eks/terraform validate
kubectl kustomize k8s/overlays/dev > /tmp/dev.yaml
kubectl apply --dry-run=server -f /tmp/dev.yaml
```

Windows PowerShell 예시:
```powershell
terraform -chdir=infra/eks/terraform validate
kubectl kustomize k8s/overlays/dev > .tmp_dev.yaml
kubectl apply --dry-run=server -f .tmp_dev.yaml
```

### 7.2 Argo CD App 등록
```bash
kubectl apply -n argocd -f argocd/apps/root-app.yaml
```

### 7.3 Argo CD 동기화 확인
1. `shop-msa-platform` 정상 Sync
2. `shop-msa-observability-prometheus` 정상 Sync
3. `shop-msa-observability-kiali` 정상 Sync
4. `shop-msa-dev` 정상 Sync
5. `shop-msa-app` 네임스페이스 Pod Ready 확인

### 7.4 Observability 접속 확인
1. `https://dev-shop.wookja.cloud/grafana` 접속
2. `https://dev-shop.wookja.cloud/kiali` 접속
3. Kiali Graph에서 Namespace `shop-msa-app` 선택 후 트래픽 확인

---

## 8. 5단계: GitHub Actions 설정 (필수)

### 8.1 워크플로우 파일
1. `.github/workflows/build-push-ecr.yml`
2. `.github/workflows/update-manifest.yml`

### 8.2 GitHub Secrets
1. `AWS_ROLE_TO_ASSUME`

### 8.3 GitHub Variables
1. `AWS_REGION` (예: `ap-northeast-2`)
2. `ECR_REGISTRY` (예: `123456789012.dkr.ecr.ap-northeast-2.amazonaws.com`)

### 8.4 동작 흐름
1. main push -> 8개 서비스 이미지 ECR push
2. manifest update PR 생성
3. merge 후 Argo CD가 변경 감지하여 배포

---

## 9. 6단계: 검증 시나리오

### 9.1 인프라/플랫폼
1. `kubectl get nodes`
2. `kubectl get pods -n istio-system`
3. `kubectl get pods -n argocd`
4. `kubectl get pvc -n shop-msa-app`
- Redis PVC가 EFS 사용
- Kafka PVC가 gp3(EBS) 사용
5. `kubectl get pods -n shop-msa-platform`
- `kube-prometheus-stack-*`, `kiali-*` Pod Running 확인

### 9.2 앱 기능
1. `/` 접속
2. `/admin` 접속
3. 회원가입/로그인
4. 상품 조회/상세
5. 주문/결제

### 9.3 Kafka 이벤트
1. 주문 시 `order-created`
2. 결제 시 `payment-created`
3. `payment-event-service` DB 반영 확인

---

## 10. 롤백 절차
1. Argo CD에서 이전 Revision으로 rollback
2. 배포 실패 시 `k8s/overlays/dev` 이전 커밋으로 되돌려 재동기화
3. 심각 장애 시 DNS를 이전 엔드포인트로 백아웃

---

## 11. 자주 막히는 포인트
1. Istio Gateway TLS secret 미생성
- `credentialName`에 맞는 cert secret 필요
2. EFS CSI IRSA 누락
- 동적 프로비저닝 실패
3. `repoURL` placeholder 미치환
- Argo CD sync 실패
4. ECR registry/account mismatch
- 이미지 pull 실패

---

## 12. 최종 점검 명령
```bash
rg -n "REPLACE_ME|<aws_account_id>|<gitsha>|CHANGE_ME|dev-rds-endpoint|fs-REPLACE_ME|<account-id>" -S . -g "!*node_modules*"
```

위 명령 결과가 0건(또는 의도된 템플릿 문서만 남음)이면 치환 완료입니다.
