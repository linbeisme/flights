# PointsBoard v11.3.7

PointsBoard combines live reward-flight availability, live cash-fare comparison, multi-currency award fees, CPP analysis, personalized recommendations, exact same-flight grouping, nearby-airport expansion, and official redemption handoff in one React application deployed through Cloudflare Workers.

## Scope of this update

This release is rebuilt from the original **v11.3.5 application source**. It preserves the prior interface, tabs, filters, settings, buttons, colors, spacing, and calculations. Only the requested changes were applied:

1. The existing **Add a Route** form is moved above **Saved Routes**. Its fields and buttons are unchanged.
2. A live **Search award space** run now reuses the cash-fare lists already requested for CPP calculations and automatically places them in the existing **Cash Fares** tab for the first selected route. The separate **Get cash fares** button remains available.
3. The bookmark icon is a single red airplane. The airplane character was removed from the page title so browsers do not show two airplane symbols.

The simplified static interactive preview from the prior package was replaced with a redirect to the actual application because the mock did not faithfully reproduce the real UI. Use the deployed app or a normal Vite development/build run to review the interface.

## Existing deployment

The active GitHub repository and Cloudflare Worker remain named **`flights`**. No Cloudflare binding, secret, route, or repository-name change is required.

- Production branch: `main`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Health endpoint: `/api/health`

## Update steps

1. Read `START_HERE.md`.
2. Overlay the v11.3.7 update patch onto the existing `flights` repository, or replace the repository contents with the complete package while retaining `.git` and runtime secrets.
3. Commit and push to `main`.
4. Wait for GitHub Actions and Cloudflare Workers Builds to pass.
5. Confirm `/api/health` reports version `11.3.7` and both provider flags are correct.
6. Hard-refresh the browser.

## Verification

```bash
npm ci
npm test
npm run build
npm run deploy:dry
```

All source-level regression, calculation, filtering, currency, recommendation, Worker, live-shaped simulation, exact-flight, nearby-airport, UI-retention, and v11.3.7 checks passed in the audit environment. JavaScript and JSX syntax parsing also passed. A clean production build must still be confirmed by GitHub Actions or Cloudflare because the isolated audit environment could not complete dependency installation from its internal npm registry.

See:

- `RELEASE_NOTES_V11_3_7.md`
- `UPDATE_INSTRUCTIONS_V11_3_7.md`
- `INDEPENDENT_AUDIT_V11_3_7.md`
- `AUDIT_EXECUTION_LOG_V11_3_7.txt`
