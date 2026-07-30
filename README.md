# PointsBoard v11.4.0

PointsBoard combines live reward-flight availability, live cash-fare comparison, multi-currency award fees, CPP analysis, personalized recommendations, exact same-flight grouping, nearby-airport expansion, and official redemption handoff in one React application deployed through Cloudflare Workers.

## v11.4.0 scope

This release adds an isolated round-trip workflow while retaining the v11.3.7 one-way workflow and interface.

### Round-trip award comparison

- Add and save a route as **One way** or **Round trip**.
- Enter exact departure and return dates.
- Search both award directions and pair the results into:
  - same-program two-one-way combinations; and
  - split-program two-one-way combinations.
- Require enough known award seats on both directions.
- Keep mixed-program point currencies separate instead of adding unlike points together.
- Display a clear disclosure that every assembled award comparison represents two separate one-way award reservations, not a guaranteed single round-trip award ticket.

### True round-trip cash comparison

- The Worker requests SerpApi Google Flights in round-trip mode.
- It uses the selected outbound itinerary token to obtain return choices.
- Round-trip cash flexibility is limited to exact dates, ±1 day, or ±3 days.
- Both dates shift together, preserving the original trip length.
- Exactly one cash cabin may be selected at a time.
- Cash fare, award points, taxes, CPP, and economic cost are compared per traveler. The passenger field remains an award-seat availability requirement.

### Round-trip calculations

For same-program combinations:

```text
Round-trip CPP = ((true round-trip cash fare - combined award taxes) / combined points) x 100
```

For split-program combinations:

- outbound and return points remain listed by program;
- no blended CPP is shown across unlike point currencies; and
- economic costs are combined only after valuing each leg using its own program valuation.

## Existing one-way behavior

The existing one-way code path remains separate and retains:

- up to five selected one-way routes;
- exact and ±1/±3/±7 date flexibility;
- multiple cash cabins;
- recommendations and alternatives;
- Exact Same Flight grouping;
- automatic Cash Fares population after award searches;
- nearby-airport expansion;
- filters, FX conversion, history, Demo mode, and redemption links.

Old saved routes without a `tripType` field continue to load as one-way routes.

## Existing deployment

The GitHub repository and Cloudflare Worker can remain named **`flights`**. No new Cloudflare binding or secret is required.

- Production branch: `main`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Health endpoint: `/api/health`
- Required secrets: `SEATS_AERO_API_KEY`, `SERPAPI_KEY`

## Verification

```bash
npm ci
npm test
npm run build
npm run deploy:dry
```

The complete logic, Worker, simulation, recommendation, currency, deployment, legacy UI-retention, and v11.4.0 round-trip test suites passed in the audit environment. TypeScript syntax transpilation also passed for all 27 JavaScript/JSX source files.

The isolated audit environment could not run a clean Vite production build because its internal package registry did not contain the required frontend packages and public npm DNS was unavailable. GitHub Actions is configured to run `npm ci`, the complete test suite, `npm run build`, and a Wrangler dry run before deployment.

See:

- `RELEASE_NOTES_V11_4_0.md`
- `UPDATE_INSTRUCTIONS_V11_4_0.md`
- `INDEPENDENT_AUDIT_V11_4_0.md`
- `AUDIT_EXECUTION_LOG_V11_4_0.txt`
