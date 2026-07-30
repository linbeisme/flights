# PointsBoard v11.4.0 Release Notes

## Summary

v11.4.0 adds true round-trip cash-fare comparison and paired outbound/return award analysis while retaining the complete v11.3.7 one-way workflow.

## Added

- One-way / Round-trip route type control.
- Exact return-date field for round-trip routes.
- Whole-trip date shifting for exact, ±1-day, and ±3-day searches.
- One-cabin-only round-trip cash selection.
- Two directional seats.aero award searches per route/date pair.
- Same-program two-one-way award combinations.
- Split-program two-one-way award combinations.
- True SerpApi round-trip flow using `type=1`, `return_date`, and outbound `departure_token` follow-up requests.
- Round-trip cash itinerary display with both legs.
- Combined same-program points, taxes, economic cost, savings, and CPP.
- Separate mixed-program point balances with no misleading blended CPP.
- Explicit two-separate-reservations disclosure on every round-trip combination.
- Round-trip search-history schema and Cash Fares history support.
- Ten targeted round-trip regression and provider-flow tests.

## Preserved

- Existing saved one-way routes load without migration.
- One-way award and cash searches remain on the original code path.
- One-way ±7-day flexibility remains available.
- One-way multi-cabin cash searches remain available.
- Recommendations, Exact Same Flight, filters, nearby airports, FX, Demo mode, history, and redemption actions remain available.

## Operational behavior

- Round-trip award availability is assembled from two one-way award searches.
- A result is not represented as a single round-trip award ticket.
- Round-trip cash fares are queried for one traveler so CPP and economic-cost calculations remain per traveler.
- The passenger field filters for sufficient award seats on both legs.
- SerpApi usage may exceed one provider request per shifted date pair because complete return choices require departure-token follow-up requests.
