# PointsBoard v11.4.3 - Deployment-Ready Source

This is the clean production source package for PointsBoard v11.4.3.

## v11.4.3 highlights

- Corrected cash-fare filter and result-card alignment on wide and medium screens.
- Reward filters remain interactive before and after a search, including round-trip combinations.
- Ticketing and differing operating airlines are shown together in cash-fare results.
- Newly saved routes appear first during the current session; the next app load sorts saved routes alphabetically by departing airport.
- Saved Routes can be filtered by All, One way, or Round trip.
- Up to 20 round-trip award options and 20 round-trip cash options are displayed.
- One-way recommendations can show up to 25 qualified redemptions per route.
- Manual FX rates expire after 30 days and must be refreshed.
- A collapsible airline-points CPP reference table shows value, valuation date, and source.

## Deployment

1. Use Node.js 22.
2. Run `npm ci`.
3. Run `npm test`.
4. Run `npm run build`.
5. Run `npm run deploy:dry`.
6. Deploy with `npm run deploy` or through the connected Cloudflare production branch.

Runtime secrets remain external to the repository:

- `SEATS_AERO_API_KEY`
- `SERPAPI_KEY`
- Optional `ALLOWED_ORIGINS`

See `START_HERE.md`, `UPDATE_INSTRUCTIONS_V11_4_2_TO_V11_4_3.md`, and `INDEPENDENT_AUDIT_V11_4_3.md`.
