---
name: apply
description: Apply to tracked jobs using the Chrome browser — fills application forms from the JobTrackr autofill profile, pauses for the user's review before every submit, and updates the tracker afterward. Use when the user says "apply to my saved jobs", "apply to <url>", or "/apply".
---

# Apply to jobs via Claude in Chrome

You drive the user's real Chrome browser to complete job applications using
their saved JobTrackr profile, then record the result in the tracker. You are
an assistant filling forms — **the user always reviews and confirms every
submission**.

## Prerequisites (check in order)

1. **Browser connection.** Browser tools must be available. If they aren't,
   tell the user to restart with `claude --chrome` (or run `/chrome`) and that
   the Claude in Chrome extension must be installed and Chrome running. Stop
   until this works.
2. **Tracker running.** `curl -s http://localhost:3000/api/jobs` from the repo
   root. If it fails, start it: `npm run dev` (background) and re-check.
   All tracker reads/writes go through this API.
3. **Profile.** `GET /api/profile`. If key fields (name, email) are empty,
   stop and ask the user to fill the Autofill Profile page first.

## Selecting jobs

- If the user gave URLs or company names, use those. For a URL not yet in the
  tracker, capture it first (open the page, extract details, `POST /api/jobs`
  with status `Saved`).
- Otherwise, apply to every job with status `Saved`
  (`GET /api/jobs?status=Saved`). Confirm the list with the user before
  starting if there are more than 3.

## Per-job workflow

1. Open the job's `sourceUrl` in a browser tab. If the posting is gone/closed,
   note it, `PATCH /api/jobs/<id>` with a note, and move on.
2. Navigate to the application form (Apply button). If the site requires a
   login or shows a CAPTCHA, pause and ask the user to handle it, then
   continue.
3. Fill the form from the profile:
   - Direct fields: name, email, phone, location, LinkedIn/GitHub/portfolio,
     current company/title, salary, notice period.
   - Yes/no compliance questions (work authorization, sponsorship): use the
     profile values **only**. If the profile doesn't answer it, ask the user —
     never guess on legal/eligibility questions. Same for EEO/demographic
     questions: leave them for the user unless the profile's custom answers
     cover them.
   - Open-ended questions ("Why us?"): draft an answer from the profile's
     cover letter template + custom answers + the job description. Show the
     draft to the user before entering it.
   - Resume upload: pause and ask the user to attach the file (file dialogs
     need the user).
4. **Never click Submit yourself.** When the form is complete, tell the user
   it's ready for review and wait for them to submit (or to tell you to
   submit).
5. After the user confirms submission:
   `PATCH /api/jobs/<id>` with `{"status": "Applied", "dateApplied": "<today>"}`.
   If they skipped it, leave the status and note why.

## Wrap-up

Report a short table: company, position, outcome (submitted / needs resume /
login required / posting closed), and remind the user that Gmail monitoring
will pick up confirmations and interview invites from here.

## Hard rules

- One application at a time; keep the user oriented on which tab you're in.
- Never fabricate qualifications, dates, or eligibility answers.
- Never overwrite text the user already typed into a form.
- Respect a site refusing automation: if a form actively fights filling,
  report it rather than forcing it.
