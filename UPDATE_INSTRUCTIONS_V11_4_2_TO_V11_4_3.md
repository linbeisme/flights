# Upgrade PointsBoard v11.4.2 to v11.4.3

## Recommended package

Use `PointsBoard_v11_4_2_to_v11_4_3_Update_Only.zip` for an existing v11.4.2 GitHub repository.

## Browser-only GitHub upgrade

1. Download and extract the update-only ZIP.
2. Open the existing GitHub `flights` repository.
3. Create a backup branch from the current `main` branch, such as `backup-v11.4.2`.
4. Return to `main`, or use a temporary release branch if preferred.
5. Select **Add file -> Upload files**.
6. Drag the contents inside the extracted update folder into the repository root.
7. Confirm GitHub shows paths such as:
   - `src/App.jsx`
   - `src/components/CashFares.jsx`
   - `src/components/CppReferencePanel.jsx`
   - `functions/api/cashfare.js`
   - `package.json`
8. Allow GitHub to replace matching files.
9. Commit with: `Update PointsBoard to v11.4.3`.
10. Open **Actions -> Verify PointsBoard** and wait for all checks to pass.

## Cloudflare

No new binding or secret is required.

Existing runtime secrets remain:

- `SEATS_AERO_API_KEY`
- `SERPAPI_KEY`
- Optional `ALLOWED_ORIGINS`

The connected Cloudflare Worker should build and deploy the same production-branch commit.

## Required verification

Open:

`https://flights.benson-lin.workers.dev/api/health`

Expected version:

```json
{
  "ok": true,
  "app": "PointsBoard",
  "version": "11.4.3",
  "liveAwardConfigured": true,
  "liveCashConfigured": true
}
```

Then hard-refresh the application and confirm:

- Header version is `v11.4.3`.
- Cash filter controls are aligned.
- Reward filters change one-way and round-trip results after a search.
- Different operating airlines appear in brackets in cash results.
- Saved Routes has All, One way, and Round trip filters.
- A newly saved route appears first; after reopening the app, routes sort by departure airport.
- Round-trip views show no more than 20 options per displayed group.
- One-way recommendation groups can show up to 25 qualified options.
- An FX rate older than 30 days is marked expired.
- Reference CPP Library displays airline values, date, and source.

## Rollback

Restore the `backup-v11.4.2` branch to `main`, then allow Cloudflare to redeploy the restored commit. No storage or database rollback is necessary.
