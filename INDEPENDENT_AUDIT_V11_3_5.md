# PointsBoard v11.3.5 Independent Audit

## Disposition

Approved for overlay onto an existing v11.3.4 `flights` repository and for GitHub Actions / Cloudflare staging deployment, subject to the normal clean production-build gates.

## Verification completed

- Full inherited calculation, filtering, currency, recommendation, exact-flight, nearby-airport, Worker, and deployment test suite passed.
- New v11.3.5 regression checks passed for:
  - Version badge and health version
  - Click-away popover dismissal
  - Light-blue filter and FX buttons
  - FX collapsed default and automatic reveal for newly detected foreign currencies
  - Saved Routes hide/show behavior
  - Full loyalty-program hover labels
  - Exact, ±1, ±3, and ±7 Cash Fare date generation
  - Search-date retention on returned fare rows
- 25 active JavaScript and JSX files passed TypeScript syntax parsing.
- The standalone interactive preview passed browser smoke checks for popover dismissal, FX hide/show, and Saved Routes hide/show.
- No provider credentials are included in the package.

## Date-flexibility reliability note

A ±7-day search covers 15 dates. With four cabins selected, that can create up to 60 SerpApi requests. The UI displays the lookup count before the search and the client limits concurrent requests to four. Users should monitor their SerpApi quota and start with one cabin when exploring wide date ranges.

## Build limitation

A clean `npm ci` did not complete within the isolated artifact environment. Source tests and syntax checks passed; GitHub Actions and Cloudflare Workers Builds remain the authoritative clean-install, Vite build, and deployment checks.
