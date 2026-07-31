# Start Here - PointsBoard v11.4.3

## Updating an existing v11.4.2 deployment

1. Back up the current GitHub `main` branch or create a backup branch.
2. Extract the v11.4.2-to-v11.4.3 update-only ZIP.
3. Upload the contents to the root of the existing repository and replace matching files.
4. Confirm GitHub Actions passes `npm ci`, `npm test`, `npm run build`, and `npm run deploy:dry`.
5. Confirm Cloudflare deploys the same commit.
6. Verify `/api/health` reports version `11.4.3` and both provider flags are true.
7. Hard-refresh the app and confirm the header shows `v11.4.3`.

## Fresh deployment

Use the complete deployment-ready ZIP. Upload its contents to a clean repository root, configure Cloudflare runtime secrets, and run the same verification steps.

## Required live smoke tests

- One-way reward search and filters.
- Round-trip reward search and post-search filters.
- One-way and round-trip cash searches.
- Ticketing airline plus bracketed operating airline when different.
- Saved-route All / One way / Round trip filter.
- 30-day FX expiration behavior.
- Reference CPP library source and date display.
