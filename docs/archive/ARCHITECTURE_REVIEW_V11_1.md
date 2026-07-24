# PointsBoard v11.1 — Architecture Reassessment

## Decision

The combined architecture remains appropriate, but the recommendation layer must be treated as a transparent advisory system rather than a single opaque “best flight” score.

## Final structure

```text
Live mode
seats.aero availability
        ↓
trip-detail normalization
        ↓
Google Flights cash list by route/date/cabin
        ↓
exact flight-number match
  or probable schedule match
  or labeled median benchmark
  or labeled estimate
        ↓
canonical CPP JSON valuation
        ↓
economic redemption cost
        ↓
mandatory preference validation and filtering
        ↓
route/date/cabin-isolated scoring
        ↓
explainable recommendation cards

Demo mode
local pre-built routes and rows only
        ↓
same valuation and scoring modules
        ↓
clearly labeled Demo recommendations
```

## Why this is more reliable

1. **Separation of concerns** — live API retrieval, cash matching, CPP governance, mode integrity, and ranking are independent modules.
2. **No duplicate valuation table** — annual CPP changes occur in one JSON file.
3. **Provenance before confidence** — confidence derives from the quality of the cash-fare match, not merely the fact that a price came from a live API.
4. **Hard mode boundaries** — Demo rows cannot be restored into Live mode through history.
5. **Comparable ranking pools** — normalization occurs only among the same route, date, and cabin.
6. **Input validation before scoring** — contradictory inputs do not silently produce recommendations.
7. **Explainable output** — each card states the cash basis and recommendation reasons.

## Important retained limitations

- SerpApi may not expose flight numbers for every itinerary. Those rows are downgraded to schedule-match or benchmark status.
- A schedule match is probable, not guaranteed identical.
- Published CPP values are opportunity-cost benchmarks, not cash-equivalent guarantees.
- Personal point balances, transfer partners, transfer bonuses, transfer times, and cancellation rules are not yet part of the score.
- Award inventory can disappear between search and booking.

## Next optional phase

A future v12 could add a personal-wallet layer:

- Point balances by currency.
- Transferable-bank-point mappings.
- Active transfer bonuses.
- Minimum transfer increments.
- Transfer-time and award-hold risk.
- “Best mathematically” versus “best bookable now.”

This should remain a separate module so it does not destabilize the current search and recommendation engine.
