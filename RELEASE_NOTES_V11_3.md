# PointsBoard v11.3.0 Release Notes

Release date: 2026-07-24

## Release objective

Add the first three prioritized enhancements without replacing the original Reward Results, Cash Fares, filtering, recommendation, currency, Demo/Live, or Cloudflare deployment workflows.

## 1. Exact Same Flight view

A new **Exact Same Flight** tab groups award rows only when the following source values match:

- departure date;
- origin and destination;
- cabin;
- complete source-supplied flight-number sequence.

The view preserves PointsBoard's original visual language and displays, for every loyalty program:

- operating airline;
- points;
- original-currency taxes and USD conversion when applicable;
- cash fare and cash-fare provenance;
- economic redemption cost;
- realized CPP;
- seats;
- availability update time;
- official redemption handoff.

The flight group also shows a cash-fare amount or range. Cash fare and economic cost remain explicitly separate.

Rows without complete flight numbers remain unverified and are never silently merged.

## 2. Official redemption handoff

Every reward result, recommendation card, alternative row, and same-flight program row now includes:

- **Open prefilled award search** when a best-effort official URL adapter is available;
- otherwise **Open award booking** to the official loyalty-program award page;
- **Copy booking details** for route, date, passengers, cabin, flight numbers, operating carriers, points, and fees.

Best-effort URL prefill adapters are included for American AAdvantage, United MileagePlus, Air Canada Aeroplan, and Alaska Atmos Rewards. Airline websites can change or require login, so the copyable booking packet remains the reliable fallback.

## 3. Nearby-airport search

Saved routes and newly added routes now support:

- nearby origin;
- nearby destination;
- 25-, 50-, or 100-mile radius;
- curated metropolitan airport groups;
- live preview of expanded airports and route combinations.

Guardrails:

- maximum five airports per side;
- maximum 12 route combinations per saved route;
- maximum 30 combinations per complete search;
- maximum four concurrent live route searches;
- duplicate expanded routes removed;
- base route always retained;
- expanded results deduplicated.

## Compatibility

The existing UI and workflows remain available:

- Reward Results tab;
- Recommended Redemptions;
- Other Qualifying Redemptions;
- Cash Fares tab;
- all original filters and sort options;
- multi-currency fees and manual FX;
- Demo/Live separation;
- GitHub and Cloudflare deployment architecture.

## Audit summary

Passed:

- 36 core logic groups;
- 9 Worker/Function groups;
- 16 live-shaped simulation groups;
- recommendation regression suite;
- 12 currency/provenance groups;
- 4 v11.3 feature groups;
- 6 deployment-readiness groups;
- TypeScript source syntax parsing;
- 8 interactive-preview browser smoke checks.

A clean Vite production bundle remains a deployment-environment gate because npm dependencies could not be downloaded in the audit workspace.
