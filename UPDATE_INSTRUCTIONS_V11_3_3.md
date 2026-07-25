# Update the Existing `flights` Deployment to PointsBoard v11.3.3

These instructions assume v11.3.2 is already deployed through the GitHub repository and Cloudflare Worker named `flights`.

## Patch update

1. Back up or clone the current `flights` repository.
2. Extract `PointsBoard_v11_3_3_Updated_Files.zip`.
3. Copy the contents into the repository root and allow matching files to be replaced.
4. Preserve the local `.git` folder.
5. Confirm `.github/workflows/verify.yml`, `.gitignore`, `.nvmrc`, and `.dev.vars.example` remain present.
6. Commit with `Update PointsBoard to v11.3.3`.
7. Push to `main`.
8. Wait for GitHub Actions > Verify PointsBoard to pass.
9. Wait for Cloudflare > Workers & Pages > flights > Deployments to finish.
10. Open `https://flights.benson-lin.workers.dev/api/health` and confirm version `11.3.3` with both provider flags true.

## Smoke tests

1. Search Economy cash fares.
2. Change the cabin selection after results load and confirm the old rows disappear with a refresh-search notice.
3. Run the new cabin search.
4. Open Exact Same Flight and confirm Best Realized CPP is beside Cash Fare.
5. Open Recommendations + Results and confirm Hide Filter / Show Filter.
6. Confirm the flight icon is on the right side of recommendation cards.
7. Open the information icon beside Recommended Redemptions and review the formulas.
8. Test or inspect a negative economic-savings row and confirm the value is red and flashing.

Cloudflare secrets do not need to be re-entered for this code-only update.
