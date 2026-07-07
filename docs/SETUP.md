# Setup Guide

## 1. Install & run

```bash
git clone https://github.com/lbwalton/ai-job-tracker.git
cd ai-job-tracker
npm install
cp apps/web/.env.example apps/web/.env.local
npm run dev        # http://localhost:3000
```

The tracker works immediately for manual entry. The steps below unlock the AI
and automation features.

## 2. Claude API key (AI parsing + email classification)

1. Create a key at <https://platform.claude.com> (API Keys).
2. Put it in `apps/web/.env.local`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Restart `npm run dev`.

Cost: parsing a job posting or classifying an email uses Claude Haiku and
costs a fraction of a cent. A heavy job-search month is well under a dollar.

## 3. Gmail monitoring (read-only)

1. Go to [Google Cloud Console](https://console.cloud.google.com) → create/select a project.
2. **APIs & Services → Library** → enable **Gmail API**.
3. **APIs & Services → OAuth consent screen** → External → add yourself as a test user.
4. **APIs & Services → Credentials → Create Credentials → OAuth Client ID**:
   - Type: **Web application**
   - Authorized redirect URI: `http://localhost:3000/api/gmail/callback`
5. Copy the Client ID and Client Secret into `apps/web/.env.local`:
   ```
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-...
   APP_URL=http://localhost:3000
   ```
6. Restart, open **Settings → Connect Gmail**, approve the read-only scope.
7. Click **Sync Gmail** on the dashboard. New hiring emails are classified,
   linked to applications, and confident status changes are applied
   automatically; the rest appear in **Email Inbox** for review.

Only the `gmail.readonly` scope is requested — the app can never send,
modify, or delete mail.

## 4. Chrome extension (capture + autofill)

```bash
npm run build:extension
```

1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select `apps/extension/.output/chrome-mv3`.
3. In the web app, open **Settings → Chrome Extension** and copy the Server
   URL and token.
4. Open the extension popup → **Settings**, paste both, **Save & Test**.

Usage:

- On any job posting: popup → **Save this job to tracker**. Sites with
  structured data (most ATS boards) save instantly; anything else is parsed
  by Claude.
- On an application form: fill your **Autofill Profile** in the web app once,
  then popup → **Autofill application form**. Matched fields are filled
  (never overwriting anything you typed); attach your resume and submit.

## 5. Saving jobs from your phone

No native app needed — the tracker is an installable PWA with a share target.
The one prerequisite: your phone must be able to reach the app. Either deploy
it (step 7), or on your home network open `http://<your-computer-ip>:3000`
(Tailscale also works great for away-from-home access).

**Android (share sheet, most seamless):**

1. Open the tracker in Chrome on your phone → menu → **Add to Home screen →
   Install**.
2. From LinkedIn/Indeed/any browser: **Share → JobTrackr**. The shared link is
   analyzed by AI and you get a one-tap "Save for later" / "I applied already"
   screen.

**iPhone (Shortcuts):**

iOS doesn't support PWA share targets, so use a one-time Shortcut:

1. Shortcuts app → **+** → name it "Save to JobTrackr".
2. Add action **Get URLs from Input**.
3. Add action **Get Contents of URL**:
   - URL: `https://<your-app>/api/extension/capture`
   - Method: **POST**, Request Body: **JSON** with one field:
     `url` = *URLs* (the variable from step 2)
   - Headers: `Authorization` = `Bearer <your extension token>` (from
     Settings → Chrome Extension)
4. In the Shortcut's settings (ⓘ), enable **Show in Share Sheet** (accepts
   URLs).

Now Share → **Save to JobTrackr** from any app captures the posting — the
server fetches and parses it, so it works even though the phone never opens
the tracker. You can also always just open the app in Safari/Chrome and use
**/capture** to paste a link.

## 6. Import your v1 data

In the old single-file app: Configuration Setup → **Export Backup**.
In the new app: **Settings → Data → Import Backup**. Duplicates are skipped.

## 7. Optional: deploy for scheduled sync

Locally, email sync runs when you click Sync. For hands-off sync every 30
minutes, deploy `apps/web` (Vercel config included):

- Replace SQLite with a hosted DB (edit `apps/web/src/lib/db.ts`; Turso/libSQL
  is nearly drop-in, or any Postgres with a small rewrite of the SQL).
- Set `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `APP_URL=https://your-app.vercel.app`, and a random `CRON_SECRET`.
- Add `https://your-app.vercel.app/api/gmail/callback` to the OAuth client's
  redirect URIs.

## Troubleshooting

- **“ANTHROPIC_API_KEY is not configured”** — add the key to
  `apps/web/.env.local` and restart the dev server.
- **Gmail `redirect_uri_mismatch`** — the redirect URI in Google Cloud must be
  exactly `${APP_URL}/api/gmail/callback`.
- **Extension shows a red dot** — the web app isn't running, or the token
  doesn't match (Settings → Chrome Extension → Regenerate, then re-paste).
- **URL analysis fails on some sites** — LinkedIn and some boards block server
  fetches. Use the extension capture (reads the page you're already on) or
  Copy & Paste mode instead.
