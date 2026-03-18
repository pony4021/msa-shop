# Argo CD Apps

## Files
- `root-app.yaml`: app-of-apps root
- `platform-app.yaml`: platform namespace resources and Istio ingress NLB service
- `shop-msa-dev-app.yaml`: dev application stack (`k8s/overlays/dev`)
- `observability-prometheus-app.yaml`: Prometheus + Grafana (`kube-prometheus-stack`)
- `observability-kiali-app.yaml`: Kiali server

## Bootstrap
```bash
kubectl apply -n argocd -f argocd/apps/root-app.yaml
```

## Sync Order (recommended)
1. Install Argo CD in `argocd` namespace
2. Apply `root-app.yaml`
3. Verify `shop-msa-platform` synced first
4. Verify `shop-msa-observability-prometheus` and `shop-msa-observability-kiali` synced
5. Verify `shop-msa-dev` synced after platform readiness

## Notes
- Replace `repoURL` placeholders with your actual GitHub repository URL.
- For production, keep `shop-msa-dev` auto-sync and set `stg/prod` apps to manual sync.
- Access paths (dev): `https://dev-shop.wookja.cloud/grafana`, `https://dev-shop.wookja.cloud/kiali`
