# PointsBoard v11.4.3 Release Notes

## Release objective

Improve presentation, make returned results react immediately to filters, organize saved routes, increase useful result counts, control stale FX inputs, and expose the reference CPP dataset used by economic-cost calculations.

## User-interface corrections

- Widened the application shell and saved-route column to reduce compressed controls.
- Rebuilt the Cash Fares filter area as a responsive card grid.
- Aligned Stops, Connection Airports, Total Travel Time, Layover Duration, Departure Window, and Arrival Window controls.
- Reworked round-trip cash-fare headers so itinerary, airline, operating-airline, and fare information align consistently.

## Live filtering before and after search

- One-way results continue to react immediately to Programs, Cabin, Stops, Time Windows, Connection Airports, Layover Duration, Total Travel Time, and passenger-seat filters.
- Round-trip searches now preserve the returned directional award scenarios.
- Changing applicable filters after a round-trip search rebuilds and re-ranks the displayed combinations without another provider request.
- Same-program and split-program combinations both respond to current filter selections.
- Filters selected before Search are applied when results first appear.

A program not included in the original provider search cannot be added to that returned dataset without running Search again. Deselecting or reselecting programs that were included in the search updates the displayed results immediately.

## Cash-fare airline presentation

- Marketing/ticketing airlines remain displayed prominently.
- When the provider identifies a different operating airline, the result adds a bracketed `Operated by ...` line.
- The behavior applies to one-way and round-trip cash-fare cards.

## Saved Routes organization

- A newly saved route appears at the top during the current session.
- On the next application load, persisted routes are sorted by departing airport, then destination, trip type, and date.
- Added Saved Routes view buttons for:
  - All
  - One way
  - Round trip

## Result limits

- Round-trip reward results: up to 20 same-program and 20 split-program options can be presented by category, with each visible group capped at 20.
- Round-trip cash fares: up to 20 matching options are displayed after cabin and cash filters.
- One-way reward recommendations: up to 25 qualified options per route group, consisting of up to five featured recommendations and up to 20 additional qualified alternatives.

## FX validity

- Manual FX entries now require both a positive rate and a rate date.
- A saved manual rate remains active for 30 days.
- After expiration, the app stops using that rate for USD conversion, CPP, economic cost, and savings until the rate is manually refreshed.
- The FX panel shows active, expired, and remaining-day status.

## Reference CPP library

- Added a collapsible Reference CPP Library section.
- Lists all airline loyalty currencies available in `public/cpp-library.json`.
- Displays:
  - Airline program
  - Reference CPP
  - Valuation date
  - Source
  - Link to the valuation source when provided
- Reference CPP and realized CPP remain clearly distinguished.

## Compatibility

- Existing one-way and round-trip route records remain compatible.
- Existing cash and recommendation histories remain loadable.
- Older saved round-trip histories without raw scenario records continue to support client-side filtering from their saved combination legs.
- No new Cloudflare binding or runtime secret is required.

## Version

- Application version: `11.4.3`
- Expected health endpoint version: `11.4.3`
