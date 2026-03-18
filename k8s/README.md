## k8s 구조 (kustomize)

이 레포는 `k8s/base`를 공통 리소스로 두고, 환경별로 `k8s/overlays/*`에서 패치/추가 리소스를 적용하는 방식으로 관리합니다.

- **`k8s/base`**: 공통 리소스 (apps, redis/kafka, 공통 ConfigMap/Secret, 네임스페이스 등)
- **`k8s/overlays/dev|stg|prod`**: EKS/Istio + 외부 DB(RDS) 전제
- **`k8s/overlays/local`**: 로컬/단순 K8s에서 바로 실행할 수 있도록 **Istio 제거 + in-cluster Postgres + nginx gateway**를 추가

---

## local overlay 실행

### 1) Secret 값 수정

아래 두 파일의 `CHANGE_ME_*` 값을 원하는 값으로 바꿔주세요.

- `k8s/overlays/local/platform/postgres.yaml`
  - `shop-msa-postgres-secrets.POSTGRES_PASSWORD`
- `k8s/overlays/local/patches/patch-secrets-local.yaml`
  - `*_DATABASE_URL` 안의 패스워드

두 값은 **같아야** 합니다. (서비스가 DB에 접속할 때 쓰는 패스워드와, Postgres 컨테이너가 초기화할 때 쓰는 패스워드)

### 2) (선택) StorageClass 이름 확인

기본값은 `standard`로 되어 있습니다.

- `k8s/overlays/local/patches/patch-storageclass-default.yaml`
- `k8s/overlays/local/platform/postgres.yaml`

로컬 클러스터 기본 StorageClass가 `standard`가 아니면 해당 값을 바꿔주세요.

### 3) 적용

```bash
kubectl apply -k k8s/overlays/local
```

### 4) 접근

local overlay는 `nginx` 서비스로 프론트/어드민/백엔드 API를 한 번에 라우팅합니다.

```bash
kubectl -n shop-msa-app port-forward svc/nginx 3333:80
```

- 프론트: `http://localhost:3333/`
- 어드민: `http://localhost:3333/admin`
- 헬스: `http://localhost:3333/health`

---

## 이미지 관련 (local)

`k8s/overlays/local`은 기본적으로 로컬에서 빌드되는 이미지 이름을 사용합니다.

- `msa-shop-frontend:latest`
- `msa-shop-frontend-admin:latest`
- `msa-shop-user-service:latest` 등

클러스터 유형에 따라 아래 중 하나가 필요합니다.

- **Docker Desktop Kubernetes**: 로컬 Docker 이미지가 그대로 사용되는 경우가 많습니다.
- **kind**: 노드로 이미지를 로드해야 합니다.

```bash
docker compose build
kind load docker-image msa-shop-user-service:latest msa-shop-product-service:latest msa-shop-order-service:latest msa-shop-inventory-service:latest msa-shop-payment-service:latest msa-shop-payment-event-service:latest msa-shop-frontend:latest msa-shop-frontend-admin:latest
```

---

## dev/stg/prod overlay 적용

기존 구조대로 적용하면 됩니다.

```bash
kubectl apply -k k8s/overlays/dev
```

> dev/stg/prod는 Istio CRD/리소스와 외부 DB 엔드포인트(Secret 내 `*_DATABASE_URL`)가 필요합니다.

