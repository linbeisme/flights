# Start Here - PointsBoard v11.2.1

PointsBoard combines live award availability, live cash-fare comparison, multi-currency award fees, and explainable redemption recommendations.

## Fastest deployment path

1. Read `docs/PointsBoard_v11_2_1_Beginner_Setup_Guide.pdf`.
2. Upload the **contents of this folder** to a GitHub repository so `package.json` and `wrangler.jsonc` are at the repository root.
3. Connect the repository to **Cloudflare Workers Builds**.
4. Add the encrypted Cloudflare secrets `SEATS_AERO_API_KEY` and `SERPAPI_KEY`.
5. Deploy, then open `/api/health` on the deployed domain.
6. Confirm both configuration flags are `true` before using Live mode.

## Important rules

- Do not commit `.dev.vars` or any API key.
- Demo mode uses only local illustrative data.
- Live mode never substitutes a deterministic cash fare. When SerpApi does not return a fare, cash fare and cash-based CPP remain unavailable.
- Foreign-currency award fees require a manual USD FX rate before CPP and economic cost are calculated.

## Local verification

```bash
npm ci
npm test
npm run build
npm run deploy:dry
```

The included GitHub Actions workflow runs these checks after each push to `main` and for pull requests.
