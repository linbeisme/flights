# PointsBoard v11.2.1 - Independent Reliability and Deployment Audit

**Audit date:** July 24, 2026  
**Scope:** source package, calculations, recommendation behavior, Live/Demo integrity, API Worker, GitHub automation, Cloudflare configuration, and beginner deployment readiness.

## Executive conclusion

**Disposition: conditionally approved for GitHub upload and Cloudflare Workers staging deployment.**

The package is structurally deployable as one Cloudflare Worker with static React assets and protected `/api` routes. All executable source-level test suites passed. The audit found and corrected one material inconsistency: Live mode previously retained a deterministic cash-fare estimate when live cash pricing was unavailable, despite the interface promising no synthetic fallback. Version 11.2.1 now leaves cash fare, cash-derived CPP, and savings unavailable unless SerpApi supplies live pricing.

A credentialed deployment to the user's GitHub and Cloudflare accounts was not performed because those accounts and API secrets are not available in this audit environment. A fresh `npm ci`/Vite build was also blocked by the audit sandbox's package-network failure (internal mirror HTTP 503; direct npm DNS `EAI_AGAIN`). This is an environmental limitation rather than a detected source-code failure. The package includes a GitHub Actions workflow that performs the clean install, complete test suite, production build, and Wrangler dry run after upload.

## Audit rating

| Area | Rating | Finding |
|---|---:|---|
| Core calculations | 9.2/10 | CPP, FX, economic cost, and ranking math passed deterministic tests. |
| Live/Demo integrity | 9.3/10 | Demo and legacy synthetic rows are rejected from Live searches/history. |
| API security and validation | 8.9/10 | Same-origin CORS, optional allowlist, secret isolation, validation, and health status are present. |
| Deployment configuration | 9.0/10 | Wrangler static assets, Worker routes, SPA handling, CI, and secrets model are coherent. |
| Production evidence | 7.5/10 | No credentialed production deployment; clean build deferred to GitHub/Cloudflare due sandbox package-network failure. |
| **Overall** | **8.8/10** | Ready for staged deployment subject to the first green CI/build and health checks. |

## Tests executed

- 36 core logic groups
- 9 Function/Worker groups
- 16 live-shaped pipeline simulation groups
- 1 recommendation regression suite
- 12 currency, provenance, and recommendation groups
- 6 deployment-readiness groups

**Total: 80 named groups/checks, all passed.** The raw execution log is included as `AUDIT_EXECUTION_LOG_V11_2_1.txt`.

## Material finding corrected during this audit

### Live cash estimate contradicted strict Live mode

**Prior risk:** a failed or unconfigured live cash-fare lookup could create a deterministic route/cabin estimate. Award data remained live, but the cash estimate could still influence CPP and recommendations. This contradicted the app's strict mode language.

**Correction:**

- `/api/cashfare` returns `source: "unavailable"` with no priced rows if `SERPAPI_KEY` is absent, no live prices are returned, or the provider fails.
- Client code does not synthesize a replacement fare.
- Search history sanitization rejects legacy `cashSource: "estimate"` rows.
- UI labels unavailable cash fares rather than coloring or footnoting them as estimates.
- Regression tests prove that network failures and missing keys create no synthetic cash rows.

## Deployment architecture review

The package uses:

- Vite/React frontend built to `dist/`.
- `worker/index.js` for `/api/search`, `/api/cashfare`, and `/api/health`.
- Cloudflare static-assets binding `ASSETS` for the SPA.
- `not_found_handling: "single-page-application"` for client-side navigation.
- Server-side secrets for seats.aero and SerpApi.
- GitHub Actions for clean install, tests, build, and Wrangler dry-run verification.

This is a suitable GitHub-source/Cloudflare-runtime architecture. GitHub Pages alone is not recommended because the API keys must not be embedded in browser code.

## Security review

Passed controls:

- No real API keys in the package.
- `.dev.vars`, `node_modules`, `dist`, Wrangler state, and dry-run output are ignored.
- CORS defaults to same-origin; additional origins require `ALLOWED_ORIGINS`.
- Health endpoint reports only Boolean configuration state.
- Security headers include CSP, `nosniff`, restrictive permissions policy, and clickjacking protection.
- Input validation covers IATA formats, real ISO dates, same-airport searches, date ordering, request count, cabin, and methods.

Residual considerations:

- Users must treat the seats.aero and SerpApi keys as secrets and rotate them if exposed.
- Provider quotas, rate limits, and data coverage remain external dependencies.
- The optional `ALLOWED_ORIGINS` setting should remain blank unless a separate frontend origin is intentionally used.

## Accuracy review

- CPP is calculated only when cash fare, USD-converted taxes/fees, and points are available.
- Non-USD taxes preserve the original currency and require a manual FX rate.
- Missing taxes are not treated as zero.
- Cash-fare provenance distinguishes exact itinerary, probable schedule, same-airline benchmark, route/cabin benchmark, and unavailable.
- High confidence is limited to an exact live itinerary match.
- Recommendations are isolated by route, date, and cabin.
- Overnight windows, connection include/exclude rules, total duration, stops, layovers, and cabin filters are tested.

## Deployment gates

Before production use, all of these must be green:

1. GitHub Actions workflow completes successfully.
2. Cloudflare Workers Build completes successfully.
3. `/api/health` reports `ok: true`.
4. `liveAwardConfigured` is `true`.
5. `liveCashConfigured` is `true` if cash fares/CPP are expected.
6. Demo mode works, then turning Demo off clears Demo results.
7. A small live search returns award results without revealing secrets in browser source or network responses.
8. A cash-fare failure displays unavailable, not an estimate.

## Final opinion

The package can be hosted from GitHub and deployed through Cloudflare Workers Builds using the included guide and configuration. It is ready for the user's staged deployment. Production approval should be granted after the user's first clean CI/build, Cloudflare deployment, health endpoint verification, and a live smoke test with valid provider credentials.
