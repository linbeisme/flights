# Update Instructions — PointsBoard v11.4.0

## Repository update

1. Open the existing GitHub repository named `flights`.
2. Back up the current main branch or create a release tag.
3. Replace or upload the package files at the repository root.
4. Do not upload `.dev.vars` or any API key.
5. Commit and push to `main`.
6. Review the **Verify PointsBoard** GitHub Actions job.
7. Confirm the Cloudflare Worker build/deployment succeeds.
8. Open `/api/health` and confirm version `11.4.0` and both provider flags.

## Round-trip smoke test

1. Open **Add a route**.
2. Choose **Round trip**.
3. Enter different origin and destination airport codes.
4. Enter a departure date and a later return date.
5. Select one cash cabin.
6. Confirm the flexibility list offers only Exact dates, ±1 day, and ±3 days.
7. Save the route and run **Search round trip**.
8. Confirm:
   - same-program and split-program sections appear;
   - every option shows outbound and return legs;
   - the cash value is labeled as a true round-trip fare per traveler;
   - same-program options show combined points and CPP when source data permits;
   - split-program options keep each point currency separate;
   - every option displays the two-separate-one-way-awards disclosure; and
   - the Cash Fares tab is populated with complete round-trip itineraries.

## Whole-trip flexibility smoke test

For a trip from October 10 to October 20 with ±3 days, confirm the app evaluates these date pairs:

```text
October 7  to October 17
October 8  to October 18
October 9  to October 19
October 10 to October 20
October 11 to October 21
October 12 to October 22
October 13 to October 23
```

The trip length must remain unchanged.

## One-way regression smoke test

1. Add or select a one-way route.
2. Confirm up to five one-way routes can still be selected.
3. Confirm ±7-day flexibility remains available.
4. Confirm multiple cash cabins can still be selected.
5. Run an award search and verify Recommendations, Results, Exact Same Flight, and Cash Fares still function.
6. Confirm old saved routes load as one-way routes.

## Rollback

Restore the prior tagged release or prior repository commit and redeploy. No data-store migration or Cloudflare binding rollback is required.
