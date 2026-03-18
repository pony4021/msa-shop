# Kafka/Redis Storage Policy

## Decision
- Redis: EFS (`efs-sc`)
- Kafka: EBS (`gp3`)

## Why
1. Redis can tolerate network filesystem characteristics in this project scope.
2. Kafka requires low latency and stable fsync behavior. EFS is not recommended for production Kafka logs.
3. EBS per broker provides better throughput/latency and failure domain isolation.

## Production guidance
- Use 3+ Kafka brokers
- Topic replication factor >= 3
- min.insync.replicas >= 2
- Separate broker PVCs and zone-aware scheduling
