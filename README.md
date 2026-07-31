# PointsBoard v11.4.1

PointsBoard combines live reward-flight availability, live cash-fare comparison, multi-currency award fees, CPP analysis, personalized recommendations, exact same-flight grouping, nearby-airport expansion, and official redemption handoff in one React application deployed through Cloudflare Workers.

## v11.4.1 scope

This release refines the v11.4.0 round-trip workflow while preserving the existing one-way workflow.

### User-interface and synchronization updates

- Replaced the bookmark/tab icon with a single vector-drawn red airplane and colored in-app airplane glyphs red.
- Reward-cabin filters now start with **Economy only**; users may add other cabins for one-way searches.
- Selecting a round-trip route automatically changes the reward-cabin filter to the route's single cash cabin and unchecks the other cabins.
- Leaving round-trip mode restores the one-way default of Economy only.
- Cash Fares automatically follows the selected route's trip type: One way for one-way routes and Round trip for round-trip routes.
- Recommendations + Results, Exact Same Flight, and Cash Fares use distinct selected-tab and selected-section colors. Recommendations + Results remains the default.

### Round-trip recommendation presentation

- Operating airlines are displayed directly below each redemption program name.
- Each split-program leg uses the same program color as its Programs filter badge.
- Savings vs. cash is now a larger boxed value beside economic cost.
- Negative savings are red and flash at a medium pace, subject to reduced-motion accessibility settings.

### Saved searches

- Round-trip recommendation searches are stored in the Recommendations + Results saved-search list.
- Loading a saved round-trip recommendation restores the saved route, passenger count, paired award results, and round-trip cash data.
- Cash Fares automatically stores the live cash results reused from a recommendation search, including round trips.
- Manual one-way and round-trip Cash Fares searches continue to be stored in the Cash Fares saved-search list.

### Airport catalog

- The airport suggestion catalog now contains exactly **1,000** three-letter IATA airport codes.
- The prior catalog is preserved and supplemented with high-connectivity commercial airports.
- Manual entry continues to accept any valid three-letter IATA code even when it is not in the suggestions.

## Retained v11.4.0 round-trip behavior

- Same-program and split-program two-one-way award combinations.
- True SerpApi round-trip cash fares.
- Exact departure and return dates.
- Whole-trip date shifting limited to exact, +/-1 day, or +/-3 days.
- One round-trip cash cabin at a time.
- Round-trip CPP, economic cost, and savings calculations.
- Clear disclosure that assembled awards are two separate one-way reservations.

## Retained one-way behavior

- Up to five selected one-way routes.
- Exact and +/-1, +/-3, +/-7, +/-14, or +/-30 award-date flexibility.
- Multiple one-way cash cabins.
- Recommendations, alternatives, Exact Same Flight, nearby airports, FX, filters, saved searches, Demo mode, and redemption links.

## Deployment

The existing GitHub repository and Cloudflare Worker may remain named `flights`. No new Cloudflare binding or secret is required.

- Production branch: `main`
- Recommended Cloudflare build command: `npm run check`
- Deploy command: `npx wrangler deploy`
- Health endpoint: `/api/health`
- Required runtime secrets: `SEATS_AERO_API_KEY`, `SERPAPI_KEY`

## Verification

```bash
npm ci
npm test
npm run build
npm run deploy:dry
```

The complete inherited and v11.4.1 test suites passed in the audit environment. TypeScript syntax transpilation passed for all 28 JavaScript/JSX source files.

The isolated audit environment could not complete `npm ci` because its internal npm mirror did not contain `youch-core@0.3.3`, a Wrangler dependency. Therefore, GitHub Actions and Cloudflare must complete the clean dependency installation, Vite production build, and Wrangler dry run before production deployment.

See:

- `RELEASE_NOTES_V11_4_1.md`
- `UPDATE_INSTRUCTIONS_V11_4_1.md`
- `INDEPENDENT_AUDIT_V11_4_1.md`
- `AUDIT_EXECUTION_LOG_V11_4_1.txt`
