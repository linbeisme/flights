# PointsBoard v11.4.0 Independent Audit

## Audit objective

Determine whether v11.4.0 implements the requested round-trip functionality without materially changing the existing v11.3.7 one-way workflow, and identify any remaining deployment qualification.

## Scope

Reviewed:

- route storage and selection;
- award-search orchestration;
- SerpApi cash-fare Worker;
- round-trip pairing and ranking;
- CPP and economic-cost calculations;
- Cash Fares integration;
- saved-search history;
- one-way regression behavior;
- security/configuration tests; and
- deployment metadata.

## Procedures performed

1. Traced one-way and round-trip execution branches in `src/App.jsx`.
2. Reviewed route validation and round-trip UI constraints.
3. Verified exact/±1/±3 whole-trip date-pair generation.
4. Mocked the initial SerpApi round-trip request and outbound `departure_token` follow-up request.
5. Tested same-program and split-program award combinations.
6. Tested point-currency separation, taxes, CPP, economic cost, savings, and passenger-seat filtering.
7. Ran every legacy project test suite.
8. Ran the ten new v11.4.0 tests.
9. Transpiled all 27 JavaScript/JSX source files through the TypeScript parser to identify syntax errors.
10. Reviewed deployment configuration, secret externalization, security headers, and health endpoint versioning.

## Findings by requirement

| Requirement | Result | Audit conclusion |
|---|---|---|
| Same-program two-one-way awards | Pass | Outbound and return points/taxes are combined only when the program is the same. |
| Split-program two-one-way awards | Pass | Point currencies remain separately identified and no blended CPP is presented. |
| True round-trip SerpApi fare | Pass | Worker uses round-trip query parameters and departure-token follow-up requests to obtain return choices. |
| Maximum ±3 days | Pass | UI and route state allow exact, ±1, or ±3 only; unsupported ±7 round-trip input falls back to exact and is rejected by UI validation. |
| One cabin at a time | Pass | Round-trip route and Cash Fares controls retain exactly one selected cabin. |
| Exact departure and return dates | Pass | Return date is required and must be later than departure. |
| Whole-trip shifting | Pass | Both dates move by the same offset and trip length is preserved. |
| Round-trip CPP | Pass | Same-program CPP uses true round-trip cash fare less combined award taxes divided by combined points. |
| Economic-cost calculation | Pass | Per-leg economic costs are added; mixed programs use each leg's own valuation. |
| Separate-reservations disclosure | Pass | Every combination is labeled as two separate one-way award reservations. |
| Preserve one-way functions | Pass | Legacy tests passed; one-way remains type=2, ±7 remains, multi-cabin remains, and old routes default to one-way. |

## Additional control observations

- Round-trip cash and award values are maintained per traveler. The passenger field filters the minimum known seat availability on both award legs.
- Nearby-airport expansion returns to the corresponding expanded origin, preventing an unintended open-jaw pairing in the standard workflow.
- The round-trip flow does not create synthetic cash values when SerpApi is unavailable.
- Split-program points are not arithmetically added into a misleading total currency.
- Exact Same Flight remains available for one-way searches and is intentionally disabled for round-trip mode because the new view already displays paired legs.

## Test results

- Full `npm test`: **Pass**.
- New round-trip tests: **10 of 10 passed**.
- Legacy logic, Worker, simulation, recommendation, currency, feature-retention, and deployment suites: **Pass**.
- JavaScript/JSX syntax transpilation: **27 of 27 source files passed**.

## Qualification

A clean Vite production build and Wrangler dry run could not be executed in the isolated audit container because public npm DNS was unavailable and the internal registry lacked required frontend packages. No syntax or logic failure was identified. The included GitHub Actions workflow is configured to perform the clean install, build, and Wrangler dry run in the deployment environment.

## Opinion

**Qualified pass — ready for GitHub verification.**

Based on the procedures completed, v11.4.0 materially satisfies all requested functional requirements and preserves the tested one-way behavior. Production deployment should occur only after GitHub Actions successfully completes `npm ci`, `npm test`, `npm run build`, and `npm run deploy:dry`.
