# ✈ PointsBoard v11.3.1

PointsBoard combines live reward-flight availability, live cash-fare comparison, multi-currency award fees, CPP analysis, exact same-flight grouping, nearby-airport expansion, and official redemption handoff in one React application deployed through Cloudflare Workers.

## Start here

1. Read `START_HERE.md`.
2. Follow the existing beginner deployment guide in `docs/PointsBoard_v11_2_1_Beginner_Setup_Guide.pdf`. The GitHub and Cloudflare deployment screens and steps remain applicable to v11.3.
3. Read `docs/PointsBoard_v11_3_Feature_Guide.md` for the three new workflows.
4. Upload the project contents to GitHub with `package.json` and `wrangler.jsonc` at the repository root.
5. Connect the repository to Cloudflare Workers Builds.
6. Add `SEATS_AERO_API_KEY` and `SERPAPI_KEY` as encrypted Cloudflare secrets.
7. Verify the deployment at `/api/health`.

## What is new in v11.3

### Exact Same Flight view

A new result tab groups rows only when these source fields match:

- departure date;
- origin and destination;
- cabin;
- complete source-supplied flight-number sequence.

Each loyalty-program row keeps these values separate:

- points and taxes;
- exact or benchmark cash fare;
- economic redemption cost;
- realized CPP;
- seats and update time;
- cash-fare provenance.

Rows without complete flight numbers are never silently merged into an exact group.

### Official redemption handoff

Every reward row now provides:

- an official loyalty-program award-booking link;
- a best-effort route/date/passenger prefill for supported programs;
- a copyable booking packet when a dependable prefill is unavailable;
- a reminder to verify availability before transferring points.

### Nearby-airport search

A saved route may expand its origin, destination, or both using:

- curated metropolitan airport groups;
- a 25-, 50-, or 100-mile radius;
- a maximum of five airports per side;
- a maximum of 12 combinations per saved route;
- a maximum of 30 combinations across one search;
- four concurrent live requests.

The base route is always included and duplicate expanded routes are removed.

## Independent verification

The v11.3 audit passed:

- 36 core calculation and normalization groups;
- 9 Function and Worker groups;
- 16 live-shaped simulation groups;
- 1 recommendation regression suite;
- 12 currency and provenance groups;
- 4 v11.3 feature groups;
- 6 deployment-readiness groups;
- TypeScript JSX/JavaScript syntax parsing across active source files;
- interactive-preview browser rendering and smoke interaction.

Total: **84 named groups/checks**, plus syntax parsing and browser smoke interaction. See `AUDIT_EXECUTION_LOG_V11_3.txt` and `docs/PointsBoard_v11_3_Independent_Feature_Audit.md`.

## Strict data rules

- Demo mode uses only clearly marked local scenarios and makes no provider API calls.
- Live mode rejects Demo rows and legacy synthetic cash-fare rows.
- Missing live cash fares remain unavailable; the app does not invent a fare.
- Non-USD award taxes retain their original currency and require a manual USD FX rate before CPP and economic cost are calculated.
- Cash fare, economic redemption cost, estimated savings, and realized CPP remain separate measures.
- Same-flight grouping never substitutes a probable schedule match for an exact group.

## Local verification

```bash
npm ci
npm test
npm run build
npm run deploy:dry
```

## Cloudflare deployment

```bash
npx wrangler deploy
```

Secrets:

- `SEATS_AERO_API_KEY` — required for Live award search
- `SERPAPI_KEY` — required for Live cash fares and cash-based CPP
- `ALLOWED_ORIGINS` — optional; normally blank for same-origin hosting

## Audit limitation

The execution environment could not download npm dependencies because its npm mirror returned HTTP 503 and direct DNS access was unavailable. Therefore a fresh Vite production bundle was not generated locally. The source passed all Node tests and TypeScript syntax parsing, and the standalone interactive preview rendered successfully in Chromium. The first GitHub Actions and Cloudflare Workers Build runs remain the final clean-build gate.
