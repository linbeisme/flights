# Update the Existing `flights` Deployment to PointsBoard v11.3.2

## Recommended update method

Use the complete v11.3.2 folder to update the existing GitHub repository named `flights`. The repository is already connected to the Cloudflare Worker named `flights`, so a successful push to `main` should trigger both GitHub verification and a Cloudflare Workers Build.

## Before updating

1. Download and extract the complete v11.3.2 package.
2. Keep a backup copy of the current v11.3.1 repository.
3. Do not copy or commit real API keys.
4. Keep the existing Cloudflare encrypted secrets:
   - `SEATS_AERO_API_KEY`
   - `SERPAPI_KEY`
5. Confirm these hidden files exist in the new package:
   - `.gitignore`
   - `.nvmrc`
   - `.dev.vars.example`
   - `.github/workflows/verify.yml`

## Method A - GitHub Desktop or local Git (recommended)

1. Clone the existing `flights` repository.
2. Copy the contents of the extracted v11.3.2 project folder into the cloned repository folder.
3. Do not delete the local `.git` folder.
4. Confirm the repository root contains `package.json`, `package-lock.json`, `wrangler.jsonc`, `src`, `worker`, `functions`, `public`, and `.github`.
5. Review the changed files.
6. Commit with: `Update PointsBoard to v11.3.2`.
7. Push to `main`.
8. Open GitHub > `flights` > Actions > Verify PointsBoard.
9. Wait for a green workflow result.
10. Open Cloudflare > Workers & Pages > `flights` > Deployments.
11. Confirm the new build finishes with green Installing, Building, and Deploying stages.

## Method B - Upload only the changed-files patch

Use the separate `PointsBoard_v11_3_2_Updated_Files.zip`. Preserve each file's relative path when replacing files in the repository.

Key replacements include:

- `src/App.jsx`
- `src/api/recommendationEngine.js`
- `src/components/FxPanel.jsx`
- `src/components/RecommendationPanel.jsx`
- `functions/api/health.js`
- `wrangler.jsonc`
- `package.json`
- `package-lock.json`
- `.github/workflows/verify.yml`
- active regression tests and release documentation

## Required Wrangler settings

The deployed repository must retain:

```jsonc
{
  "name": "flights",
  "main": "worker/index.js",
  "compatibility_date": "2026-07-01",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  }
}
```

The `run_worker_first` rule prevents `/api/health`, `/api/search`, and `/api/cashfare` from being replaced by the SPA page.

## Post-deployment verification

1. Open `https://flights.benson-lin.workers.dev/api/health`.
2. Confirm:

```json
{
  "ok": true,
  "app": "PointsBoard",
  "version": "11.3.2",
  "liveAwardConfigured": true,
  "liveCashConfigured": true
}
```

3. Open `https://flights.benson-lin.workers.dev`.
4. Test Demo mode first.
5. Confirm the recommendation cards show the light-green metric block.
6. Select a flight icon and confirm the flight-detail popup opens.
7. Hide and show the FX section on each tab.
8. Confirm the qualified/not-recommended section appears when applicable.
9. Turn Demo off and confirm every synthetic result is removed.
10. Run one narrow Live search with nearby airports disabled.
11. Confirm live award rows, taxes/fees currency, cash provenance, and booking actions.
12. Review Cloudflare Observability logs for `/api/search` and `/api/cashfare` errors.

## Do not re-enter secrets after a normal code update

Encrypted Worker secrets normally remain attached to the existing Worker when only application code is updated. Re-enter them only if the health endpoint reports a required provider as unconfigured or if a new Worker was created instead of updating `flights`.
