# Independent Audit - PointsBoard v11.4.3

## Opinion

**Qualified pass - ready for GitHub and Cloudflare build verification.**

The source, automated logic, Worker behavior, deployment configuration, and JavaScript/JSX syntax passed the available independent checks. The qualification is limited to the production bundling environment: this container cannot obtain the required Vite/Wrangler dependency tree from its restricted npm registry, so GitHub Actions or Cloudflare must complete the clean `npm ci`, Vite production build, and Wrangler dry run.

## Scope

The audit evaluated the v11.4.2-to-v11.4.3 changes for:

- Layout and alignment
- Filters before and after searches
- Ticketing versus operating airline disclosure
- Saved-route ordering and trip-type filtering
- Round-trip and one-way result caps
- 30-day FX validity
- Reference CPP display
- Version consistency
- Regression of existing one-way and round-trip functionality

## Procedures performed

### 1. Source-diff review

Compared the v11.4.3 working source against the clean v11.4.2 deployment package. No existing deployment file was removed. Changes were confined to application source, API normalization, tests, version metadata, and release documentation.

### 2. Automated regression suite

Executed `npm test` against the updated source.

Passed areas include:

- 36 core logic groups
- Cloudflare function and Worker tests
- 17 live-shaped search simulation groups
- 12 currency, provenance, and recommendation groups
- v11.3 through v11.4.2 retention checks
- 10 round-trip functional checks
- v11.4.3 enhancement checks
- Deployment-readiness checks

The detailed output is retained in `AUDIT_EXECUTION_LOG_V11_4_3.txt`.

### 3. Independent JavaScript and JSX syntax pass

Ran the TypeScript parser over all active JavaScript and JSX source using `allowJs`, JSX-preserve mode, ES2022 target, and bundler module resolution. No syntax error was reported.

### 4. Layout-source inspection

Verified that:

- The application shell uses a wider maximum width.
- The saved-route sidebar has additional width.
- The Cash Fares filter controls are rendered in a responsive grid of bounded cards.
- Both time-window controls use the same card dimensions as neighboring controls.
- Round-trip cash cards use separate itinerary and fare/airline columns.

### 5. Filter behavior

Verified that one-way results continue to use the current filter object through memoized filtering.

For round trips, the audit confirmed that the application stores raw outbound and return result scenarios and rebuilds combinations from the current filters. Programs, Cabin, Stops, Time Windows, Layover Duration, Total Travel Time, Connection Airports, and passenger-seat requirements therefore affect displayed combinations after the provider search has completed.

### 6. Operating-airline disclosure

A mocked SerpApi-shaped response was used to verify normalization of a marketing airline and a differing operating airline. The UI presents the operating airline in a bracketed line beneath the ticketing airline.

### 7. Saved-route behavior

Verified:

- `onAdd` prepends a newly created route during the active session.
- Startup loading applies `sortSavedRoutes()` to persisted routes.
- The saved-route filter includes All, One way, and Round trip views.

### 8. Result caps

Verified:

- Round-trip recommendation groups display no more than 20 rows.
- Round-trip cash results display no more than 20 matching rows.
- One-way recommendation groups support up to five featured rows and 20 alternatives, for a maximum of 25 qualified recommendations.

### 9. FX expiration

Tested active and expired manual FX records. A rate older than the allowed 30-day period is rejected and produces expired-rate status rather than being applied to financial calculations.

### 10. Reference CPP library

Verified that the runtime loader retains all CPP rows, while still mapping supported PointsBoard programs for calculations. The UI reference table filters the library to airline rows and shows CPP, date, source, and the source link.

## Findings

No high- or medium-severity code defect was identified in the requested changes.

### Informational limitations

1. Filtering can only work on data returned by the original provider search. Adding a program that was excluded before Search requires a new provider search.
2. Changing the round-trip award cabin after a search can expose award rows from another cabin, but a true cash benchmark may be unavailable because the reward workflow intentionally prices only the route's designated round-trip cash cabin.
3. Reference CPP values are third-party estimates and are not guaranteed redemption values. They are used for economic-cost analysis, while realized CPP uses the live fare and award taxes.
4. Operating-airline disclosure depends on SerpApi returning `operating_airline` or `operated_by` fields.

## Production gates

Before production sign-off, confirm the same Git commit passes:

1. `npm ci`
2. `npm test`
3. `npm run build`
4. `npm run deploy:dry`
5. Cloudflare deployment
6. `/api/health` showing version `11.4.3`
7. Browser smoke tests for each requested feature

## Conclusion

The v11.4.3 source is suitable for deployment verification and presents no identified regression that would prevent moving it to GitHub and Cloudflare, subject to the clean-build production gates above.
