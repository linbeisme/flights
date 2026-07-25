# Update the Existing `flights` Repository to PointsBoard v11.3.5

Use the updated-files patch only when the current repository is already running v11.3.4.

1. Download and extract `PointsBoard_v11_3_5_Updated_Files.zip`.
2. Back up or clone the existing GitHub repository named `flights`.
3. Copy everything inside the extracted patch folder into the repository root.
4. Allow the operating system to replace matching files.
5. Do not delete the existing `.git` folder, Cloudflare secrets, or unchanged project folders.
6. Commit with `Update PointsBoard to v11.3.5`.
7. Push the commit to the `main` branch.
8. Open GitHub → `flights` → Actions → Verify PointsBoard and wait for a green result.
9. Open Cloudflare → Workers & Pages → `flights` → Deployments and wait for Installing, Building, and Deploying to finish.
10. Open `https://flights.benson-lin.workers.dev/api/health` and confirm:

```json
{
  "ok": true,
  "app": "PointsBoard",
  "version": "11.3.5",
  "liveAwardConfigured": true,
  "liveCashConfigured": true
}
```

11. Hard-refresh the main application.
12. Verify the version beside the heading, popover click-away behavior, blue controls, automatic FX reveal, Saved Routes toggle, program hover names, and Cash Fare date-flexibility choices.

Cloudflare runtime secrets should remain attached to the Worker and normally do not need to be re-entered.
