# GeoSet Kustomize Deployment

Kubernetes manifests for deploying GeoSet, organized as Kustomize overlays.

## Overlays

| Overlay | Description | Use case |
|---------|-------------|----------|
| **base** | PostGIS, metadata DB, Superset web, sample data ingest. No Redis or Celery. | Local/dev clusters, quick demos |
| **full** | Everything in base + Redis, Celery workers, Celery beat (scheduled tasks, cache warmup, report generation), Flux GitOps | Staging/production |

## Prerequisites

- A Kubernetes cluster (minikube, kind, EKS, etc.)
- `kubectl` installed and configured
- Container images pushed (default: `jmeegan607/geoset:6.0.48`, `ebienstock/geoset:data-ingest-latest`)

## Setup

### 1. Create secrets

Copy the example and fill in real values:

```bash
cp kustomize/base/secrets.yaml.example kustomize/base/secrets.yaml
```

Edit `kustomize/base/secrets.yaml` and set:

| Secret | Description | Required |
|--------|-------------|----------|
| `DATABASE_PASSWORD` | Superset metadata Postgres password | Yes |
| `POSTGIS_PASSWORD` | PostGIS (geospatial data) password | Yes |
| `EXAMPLES_PASSWORD` | Superset examples DB password | Yes |
| `SUPERSET_SECRET_KEY` | Flask secret key — generate with `openssl rand -base64 42` | Yes |
| `ADMIN_PASSWORD` | Superset admin user password | Yes |
| `MAPBOX_API_KEY` | Mapbox GL token for map tiles | Yes |

> **Never commit `secrets.yaml`** — it is gitignored. Only `secrets.yaml.example` is tracked.

### 2. Review environment variables

Base env config lives in `base/config/superset.env`. The defaults work out of the box for most setups. Key variables:

| Variable | Default | Notes |
|----------|---------|-------|
| `SUPERSET_CONFIG_PATH` | `superset_config_docker_light.py` (base) / `superset_config.py` (full) | Auto-switched by overlay |
| `DATABASE_HOST` | `postgres-metadata` | K8s service name |
| `POSTGIS_HOST` | `postgis` | K8s service name |
| `REDIS_HOST` | `redis` | Only used in full overlay |

You generally don't need to change these unless you're pointing at external databases.

### 3. Update container images (if needed)

The image tag is controlled in one place — the `images` block in `base/kustomization.yaml`:

```yaml
images:
  - name: jmeegan607/geoset
    newTag: "6.0.48"
```

Change `newTag` to use a different version. This applies to all manifests automatically.

## Deploy

### Base (dev/demo)

```bash
kubectl apply -k kustomize/base
```

### Full (staging/production)

```bash
kubectl apply -k kustomize/full
```

### Verify

```bash
kubectl -n geoset get pods
kubectl -n geoset get svc
```

Superset web will be available on port `8088` via the `superset-web` service. To access locally:

```bash
kubectl -n geoset port-forward svc/superset-web 8088:8088
```

## Full overlay extras

The full overlay adds on top of base:

- **Redis** — caching backend and Celery message broker
- **Celery workers** (2 replicas) — async query execution
- **Celery beat** — scheduled tasks including cache warmup and automated report generation
- **Flux GitOps** — auto-syncs from `raft-tech/GeoSet` main branch

It also patches `superset-web` to 2 replicas and adds a Redis readiness check to its init container.

## Teardown

```bash
kubectl delete -k kustomize/base   # or kustomize/full
```
