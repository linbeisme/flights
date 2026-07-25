# ✈ PointsBoard v11.3.5

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
2. The illustrated setup guide at `docs/PointsBoard_v11_3_2_Beginner_Setup_and_Update_Guide.docx` remains applicable to GitHub and Cloudflare deployment.
3. For an existing v11.3.4 deployment, follow `UPDATE_INSTRUCTIONS_V11_3_5.md` and overlay the updated-files patch.
4. Wait for GitHub Actions and Cloudflare Workers Builds to turn green.
5. Confirm `/api/health` reports version `11.3.5` and both configured flags as `true`.

## New in v11.3.5

- Version number displayed beside the PointsBoard heading.
- Information popovers close when the user clicks elsewhere on the page.
- Light-blue Hide/Show controls for recommendation filters and FX conversion.
- Full loyalty-program names appear when hovering or keyboard-focusing program filter buttons.
- FX conversion is hidden by default and opens automatically when a newly detected non-USD award fee requires input.
- Saved Routes can be hidden and restored; they remain visible by default.
- Cash Fare searches support Exact date, ±1 day, ±3 days, and ±7 days.
- Flexible Cash Fare results retain and display the searched date.
- The interface reports the number of live cabin/date lookups before searching.

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

## Verification

```bash
npm ci
npm test
npm run build
npm run deploy:dry
```

The source-level audit passed all active calculation, filtering, currency, recommendation, Worker, live-shaped simulation, exact-flight, nearby-airport, UI-retention, and v11.3.5 enhancement checks. See:

- `INDEPENDENT_AUDIT_V11_3_5.md`
- `RELEASE_NOTES_V11_3_5.md`
- `UPDATE_INSTRUCTIONS_V11_3_5.md`

## Cloudflare secrets

Add these as encrypted runtime secrets, not GitHub files:

- `SEATS_AERO_API_KEY`
- `SERPAPI_KEY`

## Build-environment note

The isolated audit environment could not complete `npm ci` within the available execution window. GitHub Actions and Cloudflare Workers Builds remain the final clean-install and production-build gates. All source tests and JavaScript/JSX syntax checks passed.
