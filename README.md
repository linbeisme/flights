# ✈ PointsBoard v11.3.2

PointsBoard combines live reward-flight availability, live cash-fare comparison, multi-currency award fees, CPP analysis, personalized recommendations, exact same-flight grouping, nearby-airport expansion, and official redemption handoff in one React application deployed through Cloudflare Workers.

## Existing deployment

The active GitHub repository and Cloudflare Worker are both named **`flights`**.

- Production URL: `https://flights.benson-lin.workers.dev`
- Health check: `https://flights.benson-lin.workers.dev/api/health`
- Production branch: `main`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

## Start here

1. Read `START_HERE.md`.
2. Follow `docs/PointsBoard_v11_3_2_Beginner_Setup_and_Update_Guide.docx`.
3. For an existing deployment, follow `UPDATE_INSTRUCTIONS_V11_3_2.md`.
4. Upload or push the project contents so `package.json` and `wrangler.jsonc` remain at the repository root.
5. Wait for GitHub Actions and Cloudflare Workers Builds to turn green.
6. Confirm `/api/health` reports version `11.3.2` and both configured flags as `true`.

## New in v11.3.2

### Light-green recommendation summary

Every featured recommendation groups these related decision measures inside one light-green panel:

- economic redemption cost;
- estimated economic savings;
- realized CPP;
- confidence.

Cash fare and award price remain separate so the interface does not equate cash fare with economic cost.

### Flight-detail icon

Each featured and alternative recommendation includes a flight icon. When selected, the popup shows available source-supplied details:

- flight number sequence;
- route;
- departure date and time;
- arrival time and next-day indicator;
- operating airline;
- award-seat count, or a count-not-supplied message;
- availability check time.

### Collapsible shared FX panel

The FX conversion section can be hidden and reopened. The same entered rates remain shared across:

- Recommendations + Results;
- Exact Same Flight;
- Cash Fares.

### Qualified and not-recommended alternatives

A new section distinguishes:

- **Other qualified flights** - passed the recommendation settings but did not win a featured category.
- **Not recommended under current settings** - failed one or more preferences and displays the reasons.

Up to five not-recommended rows are shown per route/date/cabin group.

## Features retained

- Saved Routes
- Reward program, cabin, schedule, stops, layover, duration, and connection-airport filters
- Recommended Redemptions and Original Reward Results
- Exact Same Flight grouping across loyalty programs
- Live Cash Fares
- Nearby-airport expansion
- Official redemption handoff and copyable booking packet
- Original-currency award taxes and manual USD FX conversion
- Strict Demo/Live separation

## Strict data rules

- Demo mode uses only clearly marked local scenarios and makes no provider API calls.
- Live mode rejects Demo rows and synthetic cash-fare fallbacks.
- Missing live cash fares remain unavailable.
- Foreign-currency award fees retain the original currency and require a valid USD FX rate before CPP and economic cost are completed.
- Missing taxes are not interpreted as zero.
- Same-flight grouping requires a complete source-supplied flight-number sequence.

## Verification

Run locally or through GitHub Actions:

```bash
npm ci
npm test
npm run build
npm run deploy:dry
```

The source-level audit passed all active calculation, filtering, currency, recommendation, Worker, live-shaped simulation, exact-flight, nearby-airport, UI-retention, and v11.3.2 enhancement checks. See:

- `AUDIT_EXECUTION_LOG_V11_3_2.txt`
- `INDEPENDENT_AUDIT_V11_3_2.md`
- `RELEASE_NOTES_V11_3_2.md`

## Cloudflare secrets

Add these as encrypted runtime secrets, not GitHub files:

- `SEATS_AERO_API_KEY`
- `SERPAPI_KEY`
- `ALLOWED_ORIGINS` is normally left blank for same-origin hosting.

## Build-environment note

The isolated audit environment could not download Vite from its npm mirror, so the final clean bundle must be confirmed through the connected GitHub Actions and Cloudflare Workers Builds pipeline. Source tests and JavaScript/JSX syntax checks passed.
