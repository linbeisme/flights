# Update Instructions — PointsBoard v11.3.7

## Existing GitHub and Cloudflare installation

1. Download and unzip `PointsBoard_v11_3_7_Updated_Files.zip`.
2. Copy its contents into the root of the existing `flights` repository and allow matching files to be replaced.
3. Do not delete `.git`, do not rename the repository or Worker, and do not change the existing Cloudflare secrets or bindings.
4. Commit and push the changes to `main`.
5. Confirm GitHub Actions completes `npm ci`, `npm test`, `npm run build`, and the Wrangler dry run.
6. Confirm Cloudflare deploys successfully.
7. Open `/api/health` and verify `"version": "11.3.7"`.
8. Hard-refresh the browser.

## Smoke test

- Confirm **Add a Route** appears above **Saved Routes**.
- Confirm all prior route buttons and controls remain available, including **Hide routes**, **Restore defaults**, reverse route, delete, nearby airport, date flexibility, and **Save route**.
- Select a route and run **Search award space** in Live mode.
- Open **Cash Fares** and confirm the live fare results from that reward search are already shown for the first selected route.
- Confirm **Get cash fares**, **Clear fares**, cabin buttons, saved searches, and cash-fare filters still work independently.
- Bookmark the page and confirm only one red airplane icon is displayed.
