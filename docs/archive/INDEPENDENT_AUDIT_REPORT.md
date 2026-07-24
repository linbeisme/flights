# Independent Reliability and Accuracy Audit — PointsBoard v11.2

## Scope

This audit independently reviewed the v11.2 changes for:

- Tax and fee currency preservation.
- Manual FX conversion.
- Reward Search and Recommendation display parity.
- CPP and economic-cost blocking when FX is missing.
- Cash-fare itinerary and operating-airline provenance.
- Operating airline, seats, layover, and timestamp presentation.
- Search and recommendation filters.
- Additional qualifying options.
- Live/Demo separation.
- Regression behavior of the existing award, cash-fare, Worker, and recommendation engines.

## Disposition

**Approved for controlled Cloudflare staging, subject to a clean production build and deployed browser test.**

The requested multi-currency rule is applied consistently to the original Reward Flights Search results and the recommendation section. No known source-level calculation defect remains from the reviewed scope.

## Calculation findings

### Foreign taxes and fees

The application preserves the original amount and ISO currency. Conversion uses:

```text
USD taxes/fees = original foreign amount × manually entered USD-per-unit rate
```

A missing, zero, negative, or nonnumeric rate returns no USD value. A missing provider tax amount remains unknown; it is not converted into a false zero-dollar fee.

### Realized CPP

```text
(cash fare − USD award taxes/fees) ÷ points × 100
```

The implementation returns no CPP when the required USD tax amount is unavailable.

### Economic redemption cost

```text
points × reference CPP ÷ 100 + USD award taxes/fees
```

The implementation returns no economic cost when either the canonical CPP valuation or required FX conversion is unavailable.

### Economic savings

```text
cash fare − economic redemption cost
```

Cash fare is not renamed as economic cost. Both remain separately visible.

## Data and UI findings

### Currency parity

Verified that both major presentation paths use the enriched normalized values:

- `RecommendationPanel.jsx`
- `FlightResults.jsx`

Both show the source-currency amount and the converted USD value or an FX-required message.

### Operating airlines

Recommendation cards and original result rows show normalized operating carrier names. Multi-carrier itineraries remain visible rather than being collapsed to the loyalty program.

### Seats

Exact positive counts are shown when supplied. Unknown counts remain explicitly unknown and are not inferred. For supported programs documented as lacking dependable seat counts, a zero value is normalized to unknown rather than presented as zero available seats.

### Layovers

Connecting itineraries show connection airports and each layover duration. Filter logic tests individual layovers, not an average.

### Availability timestamps

Rows separately retain the source-update time, when provided, and the application check time.

### Additional options

The recommendation engine returns no more than five non-featured qualifying options and excludes rows already used in featured categories.

### Cash-fare provenance

Verified hierarchy:

1. Exact flight-number sequence.
2. Schedule/stops/connections/carrier match.
3. Same operating-airline benchmark.
4. Route/cabin benchmark.
5. Estimate.

Only exact live itinerary matching qualifies for High confidence.

## Executed tests

All executable suites passed:

- **37** core logic groups.
- **14** Cloudflare function and Worker checks.
- **16** live-shaped simulation groups.
- Recommendation regression suite passed.
- **12** currency, provenance, and expanded-recommendation groups.

The standalone interactive preview JavaScript and all non-JSX JavaScript modules passed Node syntax checking.

## Build limitation

A clean `npm ci` could not be completed in this execution environment, so a new Vite production bundle and browser-level React rendering were not independently certified here. This is an environmental validation gap, not evidence of a known calculation failure.

## Required staging gate

```bash
npm ci
npm test
npm run build
npx wrangler deploy
```

Then verify:

1. Demo mode produces no award or cash API requests.
2. Live mode never restores or displays demo-tagged rows.
3. Foreign fees appear in their original currency in both result sections.
4. Missing FX suppresses CPP, economic cost, and savings.
5. Entering an FX rate updates both result sections identically.
6. Exact and benchmark cash-provenance labels agree with the underlying match.
7. Connection include/exclude, cabin, duration, and layover filters work on mobile and desktop.
8. Up to five additional qualifying redemptions render without featured duplicates.
9. The airplane favicon appears in the tab and after bookmarking.

## Residual limitations

- A provider may omit a tax currency. The app clearly labels the backward-compatible USD assumption, but provider confirmation would be preferable.
- Manual FX rates can become stale; the app records the date but does not automatically validate it.
- Same-airline and route/cabin cash benchmarks are not exact itinerary prices.
- Award availability and cash fares can change immediately after retrieval.
- Published CPP valuations are generalized opportunity-cost estimates rather than guaranteed personal value.

## Rating

**8.9/10 for source-level reliability, transparency, and calculation control.**

The remaining deduction reflects the uncompleted clean production build/deployed UI test and unavoidable provider-data limitations.
