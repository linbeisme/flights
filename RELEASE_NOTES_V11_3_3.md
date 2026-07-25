# PointsBoard v11.3.3 Release Notes

## Scope

This is a targeted UI and reliability update on top of v11.3.2. It does not change provider credentials, Worker routes, nearby-airport limits, same-flight identity rules, or the core recommendation scoring formula.

## Changes

### Cash Fare cabin changes invalidate stale results

After a live cash-fare search, changing the cabin selection now clears the previously fetched fare rows and asks the user to run a new lookup. This prevents Economy results from appearing under a newly selected Premium Economy, Business, or First search configuration.

### Exact Same Flight metric order

- Added a Best Realized CPP summary beside the group cash-fare summary.
- Reordered loyalty-program metrics to Cash Fare, CPP, Economic Cost.

### Recommendation filter labels

- `Hide settings` is now `Hide Filter`.
- `Show settings` is now `Show Filter`.

### Recommendation card controls

- Moved the flight-detail icon to the right side of the card header next to the recommendation score.
- Negative economic savings are red and use a medium-speed flash, with reduced-motion support.

### Calculation information popup

Added an information icon beside the Recommended Redemptions title. It explains the formulas and includes an 80,000-point worked example.

## Version and deployment

- Application version: `11.3.3`
- GitHub repository: `flights`
- Cloudflare Worker: `flights`
- Health endpoint: `/api/health`
