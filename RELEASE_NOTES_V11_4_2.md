# PointsBoard v11.4.2 Release Notes

## New and changed

1. Round-trip cash fare cards display airline names immediately before the cash fare.
2. Round-trip reward results re-filter instantly when Programs are deselected after the search.
3. Split-program round trips display:
   - derived outbound leg/program CPP,
   - derived return leg/program CPP,
   - derived blended CPP for the assembled round trip.
4. Direct Cash Fares searches allow multiple cabins for both One Way and Round Trip.
5. The user-supplied red-airplane PNG is used as the browser favicon and Apple touch icon.
6. Header, footer, package metadata, and `/api/health` consistently report version 11.4.2.

## Preserved

- Existing one-way reward search and filtering.
- Same-program round-trip CPP.
- Whole-trip date shifting with a maximum of +/-3 days for round trips.
- Saved recommendation and cash-fare searches.
- Exact Same Flight one-way workflow.
- 1,000-airport suggestion catalog.

## CPP disclosure

For split-program round trips, the cash fare is a single round-trip amount. Leg CPP is therefore derived by allocating the round-trip cash value between legs. The implementation uses economic-cost weighting when available, then points weighting, then a 50/50 fallback. The blended CPP divides the net round-trip cash value by the numerical sum of both point quantities and must be treated as an analytical comparison, not as a single fungible loyalty currency.
