# PointsBoard v11 — Independent Integration Audit

## Scope
Audit of the merged award-search, cash-fare, CPP valuation, economic-cost, preference-ranking, and strict Live/Demo mode features.

## Pre-built audit routes
### LAX to Europe
- LAX-LHR, business class: United, Aeroplan, Virgin Atlantic, American
- LAX-CDG, business class: Flying Blue, United, Delta
- LAX-FCO, business class: Aeroplan, Turkish, United

### TPE to Asia
- TPE-NRT, business class: Aeroplan, United, Virgin Atlantic
- TPE-ICN, economy: Delta, United
- TPE-BKK, business class: Aeroplan, United
- TPE-SIN, business class: LifeMiles, Aeroplan, Turkish

## Results
### Passed
1. Demo toggle loads only rows carrying `demo: true` and `cashSource: "demo"`.
2. Turning Demo off clears current results; the next search calls the live award pipeline only.
3. Live search code remains the original seats.aero/Cloudflare path and contains no fallback to demo award rows.
4. All 20 demo rows have internally consistent CPP using `((cash - taxes) / points) * 100`.
5. Economic cost is independently calculated as `points * reference CPP / 100 + taxes`.
6. All nine supported programs have a reference CPP mapping.
7. Recommendation scoring returns finite 0-100 scores.
8. Mandatory criteria cover stops, duration, layover range, departure window, arrival window, and avoided connection airports.
9. Preference scoring covers economic cost, duration, stops, layover quality, departure, arrival, and preferred connections.
10. Recommendations are grouped by route, date, and cabin, preventing incomparable trips from competing.
11. Existing 34 data-logic test groups passed.
12. Existing 14 Cloudflare function/worker tests passed.
13. Existing 16 live-shaped simulation groups passed.
14. The existing result list remains intact and now adds economic-cost display and sorting.
15. CPP library metadata is included in `public/cpp-library.json`.

### Corrected during audit
- Initial category winners could collapse to one itinerary. Category labels are now retained even when the same itinerary legitimately wins several categories.
- Initial recommendation calculations pooled unrelated routes. They are now isolated by route/date/cabin.
- Cost and duration normalization initially used artificial zero minima. It now uses the true observed minimum and maximum.

## Limitations
1. Build compilation could not be rerun in this execution environment because package dependencies were not available locally and npm installation could not complete. JavaScript logic tests and static module checks passed, but a deployment environment should run `npm ci && npm run build` before publishing.
2. Demo fares and award availability are illustrative, not current inventory.
3. Live cash-fare values may still be route/cabin benchmarks rather than the exact same operating flight.
4. Published CPP values are general benchmarks, not the user's personal point values.
5. Transfer bonuses, point balances, transfer times, cancellation rules, and booking restrictions are not yet included.
6. Day-level seats.aero rows without full schedule detail receive lower recommendation confidence.

## Conclusion
The integration is functionally sound at the calculation and data-flow level. Strict mode separation is implemented. The original live search pipeline is preserved, and the recommendation layer is additive. Final deployment should be conditioned on a successful clean production build and a browser smoke test in Cloudflare staging.
