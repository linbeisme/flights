# Update the Existing `flights` Deployment to PointsBoard v11.3.4

Use the updated-files patch only when the existing repository is already on v11.3.3.

1. Back up or clone the current `flights` repository.
2. Extract `PointsBoard_v11_3_4_Updated_Files.zip`.
3. Copy everything inside the extracted patch folder into the root of the existing `flights` repository.
4. Choose **Replace files in the destination** when prompted.
5. Do not delete the repository's `.git` folder or existing Cloudflare secrets.
6. Confirm `package.json`, `package-lock.json`, `src/`, `functions/`, and `.github/` remain at the repository root.
7. Commit with `Update PointsBoard to v11.3.4`.
8. Push to `main`.
9. Open GitHub **Actions → Verify PointsBoard** and wait for a green result.
10. Open Cloudflare **Workers & Pages → flights → Deployments** and wait for Installing, Building, and Deploying to finish.
11. Open `https://flights.benson-lin.workers.dev/api/health` and confirm version `11.3.4` and both provider flags are true.
12. Hard-refresh the main app with `Ctrl + Shift + R`.

## Smoke test

- Recommended Redemptions: the filter toggle is below the heading.
- Positive savings: dark purple.
- Negative savings: red medium-paced flash.
- Fastest acceptable: information icon opens the criteria explanation.
- Other Qualified Flights: Realized CPP appears.
- Cash Fares: search two cabins, deselect one, verify its rows hide without clearing; reselect it and verify the rows return. Confirm a failed refresh leaves the prior results visible.
- Exact Same Flight: CPP appears next to Cash Fare.
- Operating carrier: airline name is bold; JX appears as Starlux Airlines.

Existing `SEATS_AERO_API_KEY` and `SERPAPI_KEY` secrets remain in Cloudflare and do not need to be re-entered.
