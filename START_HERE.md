# Start Here - PointsBoard v11.3.2

This package updates the existing GitHub repository and Cloudflare Worker named **`flights`**.

## Existing production setup

- GitHub repository: `flights`
- Cloudflare Worker: `flights`
- Production branch: `main`
- Public URL: `https://flights.benson-lin.workers.dev`
- Health URL: `https://flights.benson-lin.workers.dev/api/health`

## Safest update path

1. Extract the complete v11.3.2 ZIP.
2. Back up the existing repository.
3. Replace the repository files with the complete v11.3.2 project while preserving the local `.git` folder.
4. Confirm hidden files are included: `.gitignore`, `.nvmrc`, `.dev.vars.example`, and `.github/workflows/verify.yml`.
5. Commit with `Update PointsBoard to v11.3.2` and push to `main`.
6. Wait for GitHub Actions > Verify PointsBoard to turn green.
7. Wait for Cloudflare > `flights` > Deployments to finish Installing, Building, and Deploying.
8. Open `/api/health` and confirm version `11.3.2`, `liveAwardConfigured: true`, and `liveCashConfigured: true`.
9. Run one Demo test and one narrow Live test.

See `UPDATE_INSTRUCTIONS_V11_3_2.md` and the Word guide in `docs/` for screenshots and troubleshooting.

## Important rules

- Never commit API keys.
- Do not upload `node_modules`, `dist`, `.dev.vars`, `.wrangler`, or `.wrangler-dry-run`.
- Keep `wrangler.jsonc` Worker name as `flights`.
- Keep `run_worker_first: ["/api/*"]` so API routes are not replaced by the SPA fallback.
- Normal code updates should not require re-entering existing encrypted Cloudflare secrets.
- Confirm award availability on the official loyalty-program site before transferring points.
