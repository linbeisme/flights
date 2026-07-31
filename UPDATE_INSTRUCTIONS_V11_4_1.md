# Update Instructions — PointsBoard v11.4.1

## GitHub browser update

1. Download and extract `PointsBoard_v11_4_1_Updated_Files.zip`.
2. Open the existing GitHub repository named `flights` on branch `main`.
3. Select **Add file → Upload files**.
4. Upload the contents of the extracted update folder into the repository root.
5. Do not upload `node_modules`, `dist`, `.dev.vars`, `.wrangler`, or `.wrangler-dry-run`.
6. Commit with `Update PointsBoard to v11.4.1 UI and round-trip refinements`.
7. Open **Actions → Verify PointsBoard** and require all steps to pass.

## Cloudflare verification

1. Open **Workers & Pages → flights → Settings → Build**.
2. Confirm the production branch is `main`.
3. Recommended build command: `npm run check`.
4. Deploy command: `npx wrangler deploy`.
5. Confirm runtime secrets remain:
   - `SEATS_AERO_API_KEY`
   - `SERPAPI_KEY`
6. Do not add a new KV, D1, Durable Object, R2, Queue, or service binding.
7. After deployment, open `/api/health` and confirm version `11.4.1` and both provider flags are true.

## UI smoke tests

### Bookmark and header

- Confirm the browser tab/bookmark shows one red airplane.
- Confirm the header version is v11.4.1.

### Default one-way behavior

- Open the app with no route selected.
- Confirm Recommendations + Results is the selected default tab.
- Confirm Economy is the only selected reward cabin.
- Select a one-way route and confirm Cash Fares switches to One way.
- Add Business or another reward cabin and confirm multi-cabin one-way filtering still works.

### Round-trip synchronization

- Select or add a round-trip route.
- Choose Business as the round-trip cash cabin.
- Confirm the reward Cabin filter automatically selects only Business.
- Change the round-trip cash cabin to Economy and confirm the reward Cabin filter immediately changes to only Economy.
- Confirm Cash Fares switches to Round trip and allows only one cabin.

### Round-trip recommendations

- Run a round-trip search.
- Confirm each leg displays the redemption program and the operating airline below it.
- For split-program results, confirm each program name uses its Programs filter badge color.
- Confirm Savings vs. cash is in a separate larger inset box.
- Confirm negative savings display in red and flash at medium pace.
- Confirm the two-separate-one-way-awards disclosure remains visible.

### Saved searches

- Run a round-trip recommendation search.
- Confirm it appears in Recommendations + Results → Saved searches.
- Load it and confirm the round-trip route and results return.
- Open Cash Fares and confirm the reused round-trip cash results appear in its Saved searches list.
- Run a manual round-trip cash search and confirm it is also saved.

### Tabs

- Confirm the selected tab/section colors are distinct:
  - Recommendations + Results: magenta.
  - Exact Same Flight: amber.
  - Cash Fares: green.

### Airport catalog

- Test several airports outside the prior list.
- Confirm manual entry still accepts any valid three-letter IATA code.
