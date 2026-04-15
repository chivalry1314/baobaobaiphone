# EdgeOne Pages via GitHub Actions

This repository includes:

- `.github/workflows/edgeone-pages-production.yml`
- `.github/workflows/edgeone-pages-preview.yml`

## 1. Required GitHub Secret

Create one of these repository secrets:


- `EDGEONE_API_TOKEN`: API token from EdgeOne Pages (preferred).
- `EDGEONE_TOKEN`: compatible fallback name.

## 2. Optional GitHub Variables

Create repository variables (Settings -> Secrets and variables -> Actions -> Variables):

- `EDGEONE_PROJECT_NAME`: EdgeOne project name for production deploy.
- `EDGEONE_PREVIEW_PROJECT_NAME`: EdgeOne project name for preview deploy.

If variables are not set, workflows default to repository name.

## 3. Trigger Rules

- Production workflow:
  - manual only (`workflow_dispatch`)
- Preview workflow:
  - triggers on PR open/sync/reopen to `main` or `develop`

Current recommended deployment chain in this repo:

- `main`: deployed by EdgeOne Git auto trigger.
- `develop`: EdgeOne Git auto trigger disabled.
- GitHub production workflow kept as a manual fallback.

## 4. Security Note

Preview workflow uses `pull_request` so it can trigger normally on PRs targeting `main`/`develop` and comment preview links back to same-repo PRs.
To avoid secret exposure, fork PRs are skipped by default.

## 5. Build Output

Current workflows deploy `./dist`. Make sure the build command outputs static files there.
