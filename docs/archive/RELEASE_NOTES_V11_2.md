# PointsBoard v11.2 Release Notes

## User-facing enhancements

- Added an airplane favicon for browser tabs and bookmarks.
- Added operating-airline subtitles below loyalty-program names.
- Added award-seat availability labels.
- Added layover durations for connecting itineraries.
- Added cash fare, economic cost, economic savings, and realized CPP as separate values.
- Added availability update and check timestamps.
- Added up to five additional qualifying redemption options.
- Added total-travel-time, cabin, and connection include/exclude controls.

## Multi-currency correction

- Taxes and fees now preserve their original ISO currency.
- Added a persistent manual FX panel.
- Applied the same FX rules to both recommendation cards and original Reward Flights Search results.
- Suppressed CPP and economic-cost calculations when a required FX rate is missing.
- Added explicit disclosure when a legacy provider response omits the tax currency and is treated as USD for compatibility.
- Prevented missing tax data from being silently converted into a $0 fee.
- Normalized unreliable zero-seat values for American and Turkish results to unknown unless a positive count is supplied.

## Cash-fare accuracy and labeling

- Added same-operating-airline benchmark classification.
- Schedule matching now checks operating-carrier overlap when carrier codes exist.
- Exact itinerary, schedule match, same-airline benchmark, route/cabin benchmark, estimate, and demo are separately labeled.

## Test expansion

Added coverage for:

- Currency-code normalization.
- Provider currency detection.
- Legacy USD-assumption disclosure.
- Missing and valid manual FX rates.
- Blocking CPP and economic cost without FX.
- Reward-search connection include/exclude rules.
- Same-airline cash benchmarks.
- Recommendation required/avoided connection rules.
- Five-option alternative limit.
- Foreign-currency Demo scenarios and timestamps.
- Missing-tax preservation and unreliable zero-seat normalization.

## Deployment condition

The source-level tests pass. Before production deployment, complete a clean dependency installation, Vite build, Cloudflare staging deployment, and desktop/mobile browser smoke test.
