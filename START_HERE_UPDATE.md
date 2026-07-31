# Upgrade v11.4.1 to v11.4.2

This archive contains only files that changed between the audited v11.4.1 baseline and v11.4.2.

Upload the contents of this folder into the root of the existing v11.4.1 GitHub repository and allow GitHub to replace matching files. The new file `public/red-airplane-favicon.png` must also be added.

No existing file needs to be deleted. The legacy `public/flight-favicon.svg` can remain because v11.4.2 no longer references it.

After upload, run or confirm:

```text
npm ci
npm test
npm run build
npm run deploy:dry
```

Then verify `/api/health` reports `11.4.2`.
