# Start Here — PointsBoard v11.3.7

## Updating the existing `flights` repository

1. Use `PointsBoard_v11_3_7_Updated_Files.zip` for an existing installation.
2. Overlay its contents onto the root of the GitHub repository named `flights`.
3. Keep the existing `.git` folder and Cloudflare runtime secrets.
4. Commit with `Update PointsBoard to v11.3.7` and push to `main`.
5. Wait for GitHub Actions and Cloudflare Workers Builds to turn green.
6. Confirm the `/api/health` response reports version `11.3.7`.
7. Hard-refresh the app and perform the smoke tests in `UPDATE_INSTRUCTIONS_V11_3_7.md`.

For a new installation, use the complete audited ZIP instead of the patch.

The old simplified `interactive-preview.html` now redirects to the actual app. The prior simplified mock was not a faithful representation of the real React interface.
