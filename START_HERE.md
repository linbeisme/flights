# Start Here — PointsBoard v11.4.1

## Update the existing `flights` repository

1. Back up or download the currently deployed repository.
2. Overlay the contents of the v11.4.1 update package onto the root of the GitHub repository named `flights`.
3. Retain the existing `.git` folder and Cloudflare runtime secrets.
4. Commit with `Update PointsBoard to v11.4.1 UI and round-trip refinements` and push to `main`.
5. Confirm GitHub Actions passes `npm ci`, all tests, the Vite build, and the Wrangler dry run.
6. Confirm the Cloudflare deployment succeeds.
7. Open `/api/health` and verify:
   - `version` is `11.4.1`;
   - `liveAwardConfigured` is `true`; and
   - `liveCashConfigured` is `true`.
8. Hard-refresh the application and complete the smoke tests in `UPDATE_INSTRUCTIONS_V11_4_1.md`.

No new Cloudflare binding, Durable Object, KV namespace, D1 database, or runtime secret is needed.
