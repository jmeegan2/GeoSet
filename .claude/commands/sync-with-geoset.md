# Sync with GeoSet

> **DO NOT DELETE THIS FILE.** This skill documents the critical process for syncing DART Superset with upstream GeoSet. It was manually authored and cannot be regenerated from the codebase.

Sync the DART Superset repository with the upstream GeoSet repository.

## Overview

DART Superset is a customized deployment of GeoSet (which itself is a fork of Apache Superset). The upstream GeoSet repo is configured as a local git remote named `geoset` pointing to `../GeoSet`. Periodically, DART needs to pull in new GeoSet features while preserving DART-specific customizations.

## Steps

### 1. Prepare

```
git fetch geoset
git checkout -b sync-with-geoset-<month>-<year>
```

Review what's changed on both sides:
```
git log --oneline main..geoset/main    # new GeoSet commits
git log --oneline geoset/main..main    # DART-only commits
```

### 2. Merge

```
git merge geoset/main
```

### 3. Resolve Conflicts

Conflicts fall into three categories:

#### A. Accept GeoSet version (theirs)

New GeoSet functionality should generally be brought in. Use `git checkout --theirs <file> && git add <file>` for:

- **GeoSet map plugin files** (`superset-frontend/plugins/geoset-map-chart/src/`) — layers, legends, schemas, controls, tooltips, types, utilities, tests
- **Backend schemas** (`superset/geoset_map/schemas/`, `superset/geoset_map/api.py`)
- **ViewportControl** (`superset-frontend/src/explore/components/controls/ViewportControl.jsx`)
- **General upstream files** (`.gitattributes`, `.gitignore`, `CONTRIBUTING.md`, `LLMS.md`, `.vscode/settings.json`)

#### B. Accept DART version (ours)

Use `git checkout --ours <file> && git add <file>` for DART-specific infrastructure:

- **Dockerfile** — DART maintains its own Dockerfile independently; always keep DART's version regardless of upstream changes
- **Docker support files** (`docker/dnf-install.sh`, `docker/pip-install.sh`, `docker-compose.yml`, `docker-compose-non-dev.yml`, `docker-compose-light.yml`)
- **DART config overrides** (`docker/pythonpath_dev/superset_config.py`)
- **Claude commands** (`.claude/commands/`)
- **GitLab CI/CD** (`.gitlab-ci.yml`)

#### C. Delete files removed by GeoSet

Use `git rm <file>` for files GeoSet has deleted (helm charts, RELEASING/, etc.).

#### D. Manual merge required — DART customizations on top of GeoSet base

These files need both GeoSet's new code AND DART-specific additions preserved:

| File | DART customization to preserve |
|------|-------------------------------|
| `CLAUDE.md` | DART description, GitLab instructions (not GitHub/GeoSet) |
| `superset/config.py` | `APP_NAME = "ACF Situational Awareness Tool"`, `FAVICONS` pointing to `favicon.png` (not `geoset-favicon.svg`), `THEME_DARK = None`, `ENABLE_UI_THEME_ADMINISTRATION = False` |
| `superset/initialization/__init__.py` | `login_help_blueprint` registration |
| `superset/templates/superset/spa.html` | `{{ appbuilder.app_name }}` fallback in `<title>` |
| `superset-frontend/packages/superset-ui-core/src/theme/Theme.tsx` | `brandLogoAlt: 'ACF Situational Awareness Tool'`, `brandLogoUrl: '/static/assets/images/superset-logo-horiz.png'` |
| `superset-frontend/packages/superset-ui-core/src/components/Icons/AntdEnhanced.tsx` | `IdcardOutlined` icon import and registration |
| `superset-frontend/plugins/geoset-map-chart/src/utils/svgIcons/index.ts` | `fire` icon import and registration |
| `superset-frontend/plugins/geoset-map-chart/src/utils/Shared_DeckGL.jsx` | ACF custom Mapbox basemap tile styles (hardcoded `mapbox://styles/acf-dart/...` choices) |
| `superset-frontend/src/dashboard/containers/DashboardPage.tsx` | `import getBootstrapData` and `document.title = getBootstrapData().common.menu_data.brand.alt` |
| `superset-frontend/src/explore/components/ExploreViewContainer/index.jsx` | Same `getBootstrapData()` document title pattern |
| `superset-frontend/src/pages/Login/index.tsx` | `LoginHelpCard` import and usage, `vertical` flex layout, `min-height`, provider name without `capitalize()` |
| `superset-frontend/src/utils/sanitizeFormData/index.ts` | `viewport` in `NOISY_CONTROLS` array |

### 4. Handle rename conflicts

GeoSet uses `src/utils/` while DART previously used `src/utilities/`. Accept GeoSet's `utils/` path and remove any duplicate `utilities/` directory:

```
git rm -rf superset-frontend/plugins/geoset-map-chart/src/utilities/
```

### 5. Re-delete non-production lockfiles

GeoSet upstream tracks lockfiles for docs, cypress, embedded-sdk, and websocket. DART has removed these to reduce dependency scan noise (they contain only dev-only JS dependencies that never ship in the production image). After merging, the upstream lockfiles will reappear and must be deleted again:

```
git rm -f docs/yarn.lock \
         superset-frontend/cypress-base/package-lock.json \
         superset-embedded-sdk/package-lock.json \
         superset-websocket/package-lock.json \
         superset-websocket/utils/client-ws-app/package-lock.json
```

Additionally, DART renames the frontend lockfile from `package-lock.json` to `npm-lock.json` to prevent the Gemnasium dependency scanner from flagging dev-only JS dependencies. GeoSet upstream uses the standard name, so after merging the file will reappear as `package-lock.json`. Rename it and remove the duplicate:

```
git mv superset-frontend/package-lock.json superset-frontend/npm-lock.json
```

The Dockerfile mounts `npm-lock.json` as `package-lock.json` inside the container, so `npm ci` works normally.

See `FIXING_SCANS.md` for full context on the dependency scanning setup.

### 6. Remove upstream-only directories

After merging, remove any upstream-only directories that came in:

```
git rm -rf .github/ wiki/ sample-data/ helm/superset/ Dockerfile.rhel
```

The `.gitignore` already contains these entries to prevent them from being tracked on future syncs:
- `.github/` — DART uses GitLab, not GitHub
- `wiki/` — GeoSet-specific documentation
- `sample-data/` — GeoSet example data loaders
- `helm/superset/` — GeoSet Helm charts
- `Dockerfile.rhel` — DART has its own Dockerfile

### 7. Final verification

```
# Ensure no conflict markers remain
grep -rn "^<<<<<<<\|^=======\|^>>>>>>>" --include="*.py" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.html" --include="*.md" .

# Ensure no unresolved conflicts
git diff --name-only --diff-filter=U

# Verify DART customizations are intact
grep "ACF Situational Awareness Tool" superset/config.py
grep "favicon.png" superset/config.py  # must NOT reference geoset-favicon.svg
grep "login_help_blueprint" superset/initialization/__init__.py
grep "fire" superset-frontend/plugins/geoset-map-chart/src/utils/svgIcons/index.ts
grep "IdcardOutlined" superset-frontend/packages/superset-ui-core/src/components/Icons/AntdEnhanced.tsx
grep "superset-logo-horiz" superset-frontend/packages/superset-ui-core/src/theme/Theme.tsx
grep "NOISY_CONTROLS" superset-frontend/src/utils/sanitizeFormData/index.ts
grep "acf-dart" superset-frontend/plugins/geoset-map-chart/src/utils/Shared_DeckGL.jsx
```

### 8. Commit and push

Commit the merge, push the branch, and create a merge request targeting the main branch.

## DART-Specific Assets

These files are unique to DART and do not exist in GeoSet. They should never be removed during a sync:

- `superset/views/login_help.py` — SSO login help endpoint with Mattermost webhook
- `superset-frontend/src/pages/Login/loginHelp.tsx` — Login help form component
- `superset-frontend/plugins/geoset-map-chart/src/utils/svgIcons/fire.svg` — Fire icon
- `superset-frontend/src/assets/images/superset-logo-horiz.png` — ACF branded logo
- `superset-frontend/src/assets/images/favicon.png` — ACF branded favicon
- `superset-frontend/src/assets/staticPages/404.html` — ACF branded error page
- `superset-frontend/src/assets/staticPages/500.html` — ACF branded error page
- `requirements/dart.txt` — DART-specific Python dependencies
- `.gitlab-ci.yml` — GitLab CI/CD pipeline
- `README-DART.md` — DART-specific documentation
