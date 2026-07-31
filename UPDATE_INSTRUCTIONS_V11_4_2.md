# Deploying PointsBoard v11.4.2

## Before uploading

1. Download or preserve the current v11.4.1 repository as a rollback copy.
2. Confirm the existing Cloudflare Worker is named `flights` and is connected to the correct GitHub repository.
3. Do not change or expose the existing API secrets.

## Browser upload to GitHub

1. Open the existing `flights` repository.
2. Create a backup branch named `backup-v11.4.1` from the current `main` branch.
3. Return to `main` or create a release branch named `release-v11.4.2`.
4. Select **Add file -> Upload files**.
5. Upload the contents inside `PointsBoard_v11_4_2_Deployment_Ready`, not the enclosing folder.
6. Confirm paths such as `src/App.jsx`, `functions/api/health.js`, and `public/red-airplane-favicon.png` appear at repository root level.
7. Commit with message: `Update PointsBoard to v11.4.2`.

## Required verification

GitHub Actions should run:

```text
npm ci
npm test
npm run build
npm run deploy:dry
```

Do not proceed if any step fails.

## Cloudflare settings

- Production branch: `main`
- Root directory: repository root
- Build command: `npm run check`
- Deploy command: `npx wrangler deploy`
- Runtime secrets:
  - `SEATS_AERO_API_KEY`
  - `SERPAPI_KEY`

No new KV, D1, Durable Object, R2, Queue, or service binding is required for this release.

## Post-deployment verification

Open:

```text
https://flights.benson-lin.workers.dev/api/health
```

Expected key fields:

```json
{
  "ok": true,
  "app": "PointsBoard",
  "version": "11.4.2",
  "liveAwardConfigured": true,
  "liveCashConfigured": true
}
```

Then verify:

1. Header shows `v11.4.2`.
2. Red-airplane icon appears after a hard refresh.
3. One-way reward search works.
4. Round-trip reward search works.
5. Deselecting a Program after a round-trip search immediately removes combinations that require it.
6. Split-program cards show two leg CPP values and one derived blended CPP.
7. Direct round-trip Cash Fares permits multiple cabins and returns results grouped by cabin.
8. Airlines appear immediately above/before the round-trip fare amount.

## Rollback

Restore the `backup-v11.4.1` branch to `main`, allow Cloudflare to redeploy, and confirm `/api/health` returns `11.4.1`.
