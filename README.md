# ✈ PointsBoard v11.3.3

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
2. Follow `docs/PointsBoard_v11_3_2_Beginner_Setup_and_Update_Guide.docx`; the deployment screenshots and Cloudflare steps remain applicable to v11.3.3.
3. For an existing deployment, follow `UPDATE_INSTRUCTIONS_V11_3_3.md`.
4. Upload or push the project contents so `package.json` and `wrangler.jsonc` remain at the repository root.
5. Wait for GitHub Actions and Cloudflare Workers Builds to turn green.
6. Confirm `/api/health` reports version `11.3.3` and both configured flags as `true`.

## New in v11.3.3

### Cabin-safe cash-fare searches

Cash-fare rows are now invalidated whenever the selected cabin set changes after a search. This prevents economy results from remaining on screen after Premium Economy, Business, or First is newly selected. The app displays a notice and requires a fresh live fare lookup for the selected cabin set.

### Exact Same Flight cash fare and CPP pairing

The Exact Same Flight header now places **Best realized CPP** directly beside the cash-fare summary. In each loyalty-program row, the order is now Cash Fare, CPP, then Economic Cost for faster comparison.

### Recommendation filter terminology

The recommendation-settings toggle now reads **Hide Filter** and **Show Filter**.

### Right-aligned flight details and negative-savings warning

The flight-information icon is positioned in the upper-right action area of each featured recommendation card. Negative economic savings display in red and flash at a medium pace, subject to the browser's reduced-motion preference.

### Calculation help

An information icon next to **Recommended Redemptions** explains:

- economic redemption cost;
- realized CPP;
- economic savings;
- the treatment of missing cash, taxes, and FX data;
- a worked numerical example.

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

The source-level audit passed all active calculation, filtering, currency, recommendation, Worker, live-shaped simulation, exact-flight, nearby-airport, UI-retention, and v11.3.3 enhancement checks. See:

- `AUDIT_EXECUTION_LOG_V11_3_3.txt`
- `INDEPENDENT_AUDIT_V11_3_3.md`
- `RELEASE_NOTES_V11_3_3.md`

## Cloudflare secrets

Add these as encrypted runtime secrets, not GitHub files:

- `SEATS_AERO_API_KEY`
- `SERPAPI_KEY`
- `ALLOWED_ORIGINS` is normally left blank for same-origin hosting.

## Build-environment note

The isolated audit environment could not download Vite from its npm mirror, so the final clean bundle must be confirmed through the connected GitHub Actions and Cloudflare Workers Builds pipeline. Source tests and JavaScript/JSX syntax checks passed.
