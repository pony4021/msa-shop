# Cutover & Rollback Runbook

## Cutover (dev -> stg -> prod)
1. Validate infra and cluster health
2. Sync Argo CD app for target environment
3. Run smoke tests
4. Shift traffic (DNS weight: 10% -> 50% -> 100%)

## Rollback
1. Argo CD rollback to previous revision
2. Validate pod health and API checks
3. If severe incident, move DNS back to previous endpoint
4. Open incident report and preserve logs/metrics snapshots

## Mandatory checks before promote
- Pod Ready
- PVC bound (Redis=efs-sc, Kafka=gp3)
- Kafka topic/consumer lag
- Login/order/payment critical path
