# JobTrackr — AI Job Application Tracker (v2)

Track every job application with near-zero manual effort:

- **One-click capture** — a Chrome extension detects job postings (LinkedIn, Indeed, Greenhouse, Lever, Ashby, Workday…) and saves them to your tracker with structured fields.
- **Autofill applications** — the extension fills application forms from your saved profile (name, links, work authorization, salary, stock answers). You review and hit Submit.
- **Capture from your phone** — the app is an installable PWA: on Android, share any job link straight into the tracker; on iPhone, a 2-minute Shortcut does the same. Reach your local instance from anywhere with Tailscale, or deploy it.
- **Self-updating statuses** — Gmail monitoring pulls hiring-team emails, classifies them with Claude (confirmation / assessment / interview / offer / rejection), links them to the right application, and moves the status forward automatically. Ambiguous emails land in a review inbox.
- **Batch-apply with Claude in Chrome** — a `/apply` skill for Claude Code (`claude --chrome` in this repo) drives your real browser through the saved-jobs pile: fills each form from your profile — including sites that resist scripted autofill — waits for you to review and submit, then updates the tracker.
- **Full tracker** — search, filter, sort, bulk operations, status history, notes, per-job email timeline, JSON export/import (your v1 backup imports directly).

> The previous single-file app lives in [`legacy/`](legacy/) and still works; export its backup and import it in Settings → Data.

## Repo layout

```
apps/web         Next.js app — tracker UI, API, Gmail sync, AI parsing (SQLite storage)
apps/extension   Chrome extension (WXT) — capture + autofill
packages/core    Shared types, schemas, classification taxonomy
legacy/          The original v1 single-file app
docs/SETUP.md    Step-by-step setup (API keys, Gmail OAuth, extension install)
```

## Quick start

```bash
npm install
cp apps/web/.env.example apps/web/.env.local   # add your ANTHROPIC_API_KEY (and Google creds later)
npm run dev                                     # http://localhost:3000
```

Works with no keys at all for manual tracking. Add keys to unlock:

| Feature | Needs |
|---|---|
| AI parsing (URL / paste / describe / extension capture on unstructured pages) | `ANTHROPIC_API_KEY` |
| Email monitoring + auto status updates | `ANTHROPIC_API_KEY` + Google OAuth credentials |
| Extension capture on pages with structured data | nothing |

### Chrome extension

```bash
npm run build:extension
```

Then `chrome://extensions` → enable Developer mode → **Load unpacked** → select
`apps/extension/.output/chrome-mv3`. Open the popup → Settings and paste the
Server URL + token shown in the web app under **Settings → Chrome Extension**.

### Gmail monitoring

See [docs/SETUP.md](docs/SETUP.md) — 5 minutes in Google Cloud Console for a
read-only Gmail OAuth client, then click **Connect Gmail** in Settings. Sync
runs on demand from the dashboard, and on a 30-minute schedule when deployed
(Vercel Cron is preconfigured in `apps/web/vercel.json`).

## How email monitoring works

1. Gmail is queried (read-only scope) for mail from known ATS domains
   (greenhouse.io, lever.co, ashbyhq.com, workday, …), from the email domains
   of companies you track, and for hiring-related subjects.
2. Each new email is classified by Claude into: confirmation, assessment
   invite, interview invite, offer, rejection, recruiter outreach, or other.
3. Emails are matched to your applications by sender domain, then company name.
4. High-confidence classifications that move an application **forward**
   (Applied → Interview → Offer / Rejected) are applied automatically and
   recorded in the job's status history. Everything else waits in
   **Email Inbox** for a one-click accept/dismiss.

## Privacy

- All data lives in a local SQLite file (`apps/web/data/jobtracker.db`) — or your own database if you deploy.
- Gmail access is read-only; tokens are stored in your database, never sent anywhere else.
- Email/job content is sent only to the Anthropic API for parsing/classification.
- The extension talks only to *your* server, authenticated with a token you control.

## Deploying (optional)

The app runs fine locally forever. To get scheduled email sync without your
machine running, deploy `apps/web` to Vercel (or any Node host):

1. Swap SQLite for a hosted database (the data layer is isolated in
   `apps/web/src/lib/db.ts`) — e.g. Turso/libSQL is a near drop-in.
2. Set env vars (`ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID/SECRET`, `APP_URL`,
   `CRON_SECRET`) and add your deployed callback URL to the Google OAuth client.
3. `vercel.json` already schedules `/api/gmail/sync` every 30 minutes.

## What the extension does — and doesn't

Capture and autofill are assistive: the extension never submits an application
for you. Fully automated submission violates LinkedIn/Indeed terms of service
and breaks constantly; review-and-submit keeps your accounts safe while
removing ~95% of the typing.

## License

MIT — see [LICENSE](LICENSE).
