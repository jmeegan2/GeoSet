# Fixing CI/CD Security Scans

This document describes the security scanning jobs applied by the `Dart-compliance-nobuild` compliance framework and how to address findings.

## Pipeline Security Jobs

The compliance framework injects the following jobs into every pipeline:

| Job | Image | What it scans | Status |
|---|---|---|---|
| `SAST` | `registry.management.acf.gov/ngsc-oci/security/sonarqube:0.1` | Source code (SonarQube) | Failing — `SONAR_PROJECT_NAME` must be set as a non-protected variable |
| `gemnasium-dependency_scanning` | `registry.gitlab.com/security-products/gemnasium:5-fips` | JavaScript lockfiles for known CVEs | Working |
| `gemnasium-python-dependency_scanning` | `registry.gitlab.com/security-products/gemnasium-python:5-fips` | Python dependencies via `setup.py` | Failing — scanner image missing `g++` (`cc1plus`) |
| `container_scanning` | GitLab container scanning | Built Docker image | Working |
| `Trivy Container Scan` | `aquasec/trivy:0.68.1` | Built Docker image | Working |
| `Vulnerability-Report` | — | Aggregates findings | Working |

## Dependency Scanning: What It Does

The `gemnasium-dependency_scanning` job walks the repository (up to `DS_MAX_DEPTH=2` levels deep) looking for lockfiles by exact filename:

- `package-lock.json` (npm)
- `yarn.lock` (yarn)
- `pnpm-lock.yaml` (pnpm)

For each lockfile found, it extracts every `(package, version)` pair and checks them against GitLab's advisory database. It does **not** check whether the dependency is used at runtime, is dev-only, or ships in the production image.

## The Problem

The scan flags vulnerabilities in dev/build-only JavaScript dependencies (storybook, lerna, webpack plugins, etc.) that never ship in the production Docker image. Meanwhile, the Python dependency scanner is broken, so it misses actual production vulnerabilities in packages like Authlib, PyJWT, and pyOpenSSL.

Running Trivy against the built production image produces a much more accurate picture — typically ~10 findings vs ~100+ from Gemnasium.

## Excluding the Frontend Lockfile from Gemnasium

Non-production lockfiles (`docs/yarn.lock`, `cypress-base/package-lock.json`, etc.) have already been removed from the repository. The remaining `superset-frontend/package-lock.json` is required for the Docker build (`npm ci` depends on it) and cannot be deleted.

To exclude it from the dependency scan, set the `DS_EXCLUDED_PATHS` variable.

### Option 1: Project-level CI/CD variable (recommended)

Project-level variables are available to all jobs regardless of where the job definition comes from (including compliance framework jobs).

In GitLab, go to **Settings > CI/CD > Variables** and add:

| Key | Value | Protected | Masked |
|---|---|---|---|
| `DS_EXCLUDED_PATHS` | `superset-frontend/package-lock.json` | No | No |

Or via the API:

```bash
glab api "projects/systems%2Fdart%2Fdart-superset/variables" -X POST \
  -f key=DS_EXCLUDED_PATHS \
  -f value="superset-frontend/package-lock.json" \
  -f protected=false \
  -f masked=false
```

### Option 2: In `.gitlab-ci.yml`

```yaml
variables:
  DS_EXCLUDED_PATHS: "superset-frontend/package-lock.json"
```

This may not work if the compliance framework does not merge your `variables` block into its injected jobs. Option 1 is more reliable.

## Fixing the SAST Job

The SonarQube SAST job fails because `SONAR_PROJECT_NAME` is set as a **protected** variable, but merge request pipelines run on unprotected refs. Change it to non-protected:

1. Go to **Settings > CI/CD > Variables**
2. Edit `SONAR_PROJECT_NAME` (currently `dart-dart-superset`)
3. Uncheck **Protect variable**

## Fixing the Python Dependency Scanner

The `gemnasium-python-dependency_scanning` job fails because it tries to `pip install .` to resolve the full dependency tree, and the `python-geohash` package requires compiling a C++ extension. The scanner image (`gemnasium-python:5-fips`) does not include `g++`.

This is a limitation of the scanner image. Options:

- Request the platform team to use a scanner image with build tools
- Accept the failure (`allow_failure: true` is already set)
- Rely on Trivy image scanning for Python vulnerability coverage instead

## Running Scans Locally

### Trivy (recommended — scans the actual production image)

```bash
docker build --build-arg BUILD_VERSION=local-scan --target production -t dart-superset:local-scan .
trivy image --severity HIGH,CRITICAL dart-superset:local-scan
```

### Gemnasium (replicates the CI dependency scan)

```bash
docker run --rm \
  -v "$(pwd):/code" \
  -e CI_PROJECT_DIR=/code \
  registry.gitlab.com/security-products/gemnasium:5-fips \
  /analyzer run
```

Results are written to `gl-dependency-scanning-report.json`.

Add `-e SECURE_LOG_LEVEL=debug` to see which files the scanner detects.
