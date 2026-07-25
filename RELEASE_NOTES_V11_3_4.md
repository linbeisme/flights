# PointsBoard v11.3.4 Release Notes

## Recommendation layout and presentation

- Moved **Hide Filter / Show Filter** directly below the Recommended Redemptions title and explanation.
- Positive economic savings now display in dark purple.
- Negative savings remain red and flash at a medium pace, respecting reduced-motion settings.
- Added an information popup to **Fastest acceptable** describing the filter criteria and fallback behavior.
- Other Qualified Flights now show Realized CPP.

## Cash Fare multi-cabin behavior

- Multiple cabins can be selected before a search.
- Fetched rows remain stored after cabin buttons change.
- Deselecting a cabin hides only that cabin's rows.
- Reselecting a previously searched cabin restores its stored rows without another API request.
- Selecting a cabin that was not included in the last search keeps current rows and advises the user to run another search for the added cabin.
- **Clear fares** is the explicit action that clears stored cash-fare rows.
- Failed or empty refresh attempts preserve the prior result set and display an explanatory notice.

## Airline display

- Operating-airline names are bold and darker in recommendation cards, alternative rows, and Exact Same Flight groups.
- `JX` is displayed as **Starlux Airlines**.

## Exact Same Flight

- Cash Fare and CPP remain adjacent in the group summary and loyalty-program comparison columns.

## Version

- Application version: `11.3.4`
- GitHub repository: `flights`
- Cloudflare Worker: `flights`
