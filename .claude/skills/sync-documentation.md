# Sync Documentation

Investigate all GeoSet-specific files changed on this branch and resolve documentation
drift, inconsistencies, and gaps. This includes wiki pages, README.md, comments, and
docstrings.

## Scope

Focus on files changed in the fork — exclude untouched upstream Superset files. Key areas:

- `wiki/` — all wiki pages
- `README.md`
- `superset/geoset_map/` — GeoSet backend (schemas, API)
- `superset-frontend/plugins/geoset-map-chart/` — GeoSet frontend plugin
- `superset/examples/geoset*` and `superset/cli/geoset.py` — example data
- `sample-data/` — data ingestion
- `docker-compose*.yml`, `docker/`, `Dockerfile*` — Docker configuration
- `VERSIONING.md`

## DART-specific customizations to verify after every sync

These are repeatedly overwritten by upstream merges. Check each one explicitly:

- **NIFC fire icon** — `superset-frontend/plugins/geoset-map-chart/src/utils/svgIcons.ts`
  must contain the `FireSvg` class and `case 'fire'` in the `getSvg()` switch. The
  `fire.svg` template and `index.ts` import tend to survive, but the class registration
  does not.

## How

1. Find changed files: union of `git diff --name-only`, `git diff --cached --name-only`,
   and `git diff main...HEAD --name-only`.
2. For each changed file, determine what documentation it affects and verify accuracy.
3. Verify all items in the "DART-specific customizations" section above are intact.
4. Fix anything out of sync. Only fix clearly wrong docs — don't add new docstrings or
   comments where none existed.
5. Validate changes by running `docker build --target production -t geoset-sync-test .`
   from the repo root. If the build fails, fix the issues and rebuild. Repeat until the
   build succeeds. Errors at this stage are merge artifacts, not novel bugs — fix them
   by selecting the correct version of code from either side of the merge (e.g., restoring
   missing files, picking the right import path, choosing the correct type definition).
   Do not write new code from scratch.
6. Report what was checked, what was fixed, and anything needing manual attention.
