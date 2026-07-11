# Public demo privacy checklist

This project is a static, browser-only dashboard intended for public hosting.

## What is safe to publish

- The checked-in project records in `app.js` are fictional demo records.
- The app has no backend, database, analytics script, or third-party data endpoint.
- User-created records are stored only in the visitor's own browser `localStorage`.

## Before sharing a deployment link

1. Deploy only from the `main` branch after reviewing changes.
2. Do not commit real client names, personal schedules, invoices, API keys, or screenshots containing private records.
3. Open the public link in a private/incognito browser window to confirm it starts with only the fictional demo data.
4. If real records were entered in your browser during testing, clear site data or click **恢复示例数据** before taking screenshots.
