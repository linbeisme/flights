# ✈ PointsBoard v11.3.4

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
3. For an existing v11.3.3 deployment, follow `UPDATE_INSTRUCTIONS_V11_3_4.md` and overlay the updated-files patch.
4. Wait for GitHub Actions and Cloudflare Workers Builds to turn green.
5. Confirm `/api/health` reports version `11.3.4` and both configured flags as `true`.

## New in v11.3.4

- The **Hide Filter / Show Filter** control is positioned directly below the Recommended Redemptions heading and explanatory line.
- Positive economic savings use a dark-purple emphasis; negative savings remain red and flash at a medium pace.
- Cash Fare supports multi-cabin searches whose fetched rows remain stored. Deselecting a cabin hides its rows without clearing them; reselecting restores them. Only **Clear fares** explicitly clears stored fare rows.
- **Fastest acceptable** includes an information popup explaining the eligibility criteria and fallback behavior.
- Other Qualified Flights display **Realized CPP** along with points, cash fare, economic cost, and seats.
- Operating-airline names are bold and darker in recommendation and exact-flight views.
- Airline code `JX` resolves to **Starlux Airlines**.
- Exact Same Flight continues to show CPP immediately beside Cash Fare in the summary and row columns.

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

The source-level audit passed all active calculation, filtering, currency, recommendation, Worker, live-shaped simulation, exact-flight, nearby-airport, UI-retention, and v11.3.4 enhancement checks. See:

- `INDEPENDENT_AUDIT_V11_3_4.md`
- `RELEASE_NOTES_V11_3_4.md`
- `UPDATE_INSTRUCTIONS_V11_3_4.md`

## Cloudflare secrets

Add these as encrypted runtime secrets, not GitHub files:

- `SEATS_AERO_API_KEY`
- `SERPAPI_KEY`

## Build-environment note

The isolated audit environment could not complete a clean Vite build because the local dependency installation did not provide the Vite executable. GitHub Actions and Cloudflare Workers Builds remain the final clean-install and production-build gates. All source tests and JavaScript/JSX syntax checks passed.
