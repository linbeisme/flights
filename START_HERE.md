# Start Here - PointsBoard v11.3.4

## Updating the existing `flights` repository from v11.3.3

1. Download `PointsBoard_v11_3_4_Updated_Files.zip`.
2. Back up or clone the current GitHub repository named `flights`.
3. Extract the patch and copy its contents into the root of the existing repository.
4. Replace matching files, but do not delete the existing `.git` folder or unchanged project folders.
5. Commit with `Update PointsBoard to v11.3.4` and push to `main`.
6. Confirm GitHub Actions completes `npm ci`, `npm test`, `npm run build`, and the Cloudflare dry run.
7. Confirm Cloudflare Workers Builds completes the production deployment.
8. Open `https://flights.benson-lin.workers.dev/api/health` and confirm version `11.3.4`, `liveAwardConfigured: true`, and `liveCashConfigured: true`.
9. Hard-refresh the main app and smoke-test Recommended Redemptions, Cash Fares, and Exact Same Flight.

For a new installation, use the complete audited ZIP instead of the patch.
