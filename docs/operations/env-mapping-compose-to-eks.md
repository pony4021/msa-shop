# Env Mapping: Docker Compose -> EKS

## Common
- `JWT_SECRET_KEY` -> `Secret/shop-msa-app-secrets`
- `INTERNAL_API_SECRET` -> `Secret/shop-msa-app-secrets`
- `REDIS_URL` -> `ConfigMap/shop-msa-app-config`
- `KAFKA_BOOTSTRAP_SERVERS` -> `ConfigMap/shop-msa-app-config`

## DB URLs
- `USER_DATABASE_URL` -> `Secret/shop-msa-app-secrets`
- `PRODUCT_DATABASE_URL` -> `Secret/shop-msa-app-secrets`
- `ORDER_DATABASE_URL` -> `Secret/shop-msa-app-secrets`
- `INVENTORY_DATABASE_URL` -> `Secret/shop-msa-app-secrets`
- `PAYMENT_DATABASE_URL` -> `Secret/shop-msa-app-secrets`
- `PAYMENT_EVENT_DATABASE_URL` -> `Secret/shop-msa-app-secrets`

## Frontend
- `NEXT_PUBLIC_API_URL` -> `ConfigMap/shop-msa-app-config`
- `INTERNAL_API_URL` -> `ConfigMap/shop-msa-app-config`
- `ADMIN_API_INTERNAL_URL` -> `ConfigMap/shop-msa-app-config`

## Kafka topics
- `KAFKA_TOPIC_ORDER_CREATED` -> `ConfigMap/shop-msa-app-config`
- `KAFKA_TOPIC_PAYMENT_CREATED` -> `ConfigMap/shop-msa-app-config`
