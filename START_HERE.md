# Start Here - PointsBoard v11.3.5

## Updating the existing `flights` repository from v11.3.4

1. Use `PointsBoard_v11_3_5_Updated_Files.zip`.
2. Overlay its contents onto the root of the existing GitHub repository named `flights`.
3. Keep the existing `.git` folder and Cloudflare runtime secrets.
4. Commit with `Update PointsBoard to v11.3.5` and push to `main`.
5. Wait for GitHub Actions and Cloudflare Workers Builds to turn green.
6. Confirm `https://flights.benson-lin.workers.dev/api/health` reports version `11.3.5` and both provider flags as `true`.
7. Hard-refresh the app and perform the smoke tests in `UPDATE_INSTRUCTIONS_V11_3_5.md`.

For a new installation, use the complete audited ZIP instead of the patch.
