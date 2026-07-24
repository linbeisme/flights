# PointsBoard v11.3.1 Release Notes

## Purpose

This corrective release restores full visual parity between the standalone interactive preview and the production React application. The v11.3.0 production source retained the original filters and recommendation engine, but its simplified preview omitted them and created the false impression that they had been removed.

## UI corrections

- Renamed the primary award tab to **Recommendations + Results** so the retained recommendation section is immediately discoverable.
- Preserved the complete v11.2.1 Recommendation Panel above the original reward rows.
- Preserved Saved Routes and the complete filter sidebar:
  - Reward programs
  - Cabin
  - Departure time
  - Arrival time
  - Number of stops
  - Included connection airports
  - Excluded connection airports
  - Layover duration
  - Total travel time
  - Clear all
- Confirmed that the same filtered result set feeds both Recommendations + Results and Exact Same Flight.
- Added an explicit note in Exact Same Flight explaining that all original filters apply.
- Rebuilt the standalone interactive preview to show the full original workflow plus the v11.3 additions.

## Features retained

- Recommended Redemptions with operating airline, seats, cash fare, economic cost, CPP, layovers, timestamps, multi-currency fees, FX handling, and up to five alternatives.
- Original Reward Results.
- Exact Same Flight grouping across loyalty programs.
- Cash Fares tab.
- Nearby-airport search.
- Official redemption handoff.
- Strict Demo/Live separation.

## Audit

- All source-level tests passed.
- New UI-retention regression test passed.
- Standalone preview JavaScript passed syntax validation.
- Ten browser interaction smoke checks passed.
