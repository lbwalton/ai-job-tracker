#!/bin/bash
# Scheduled Gmail sync + needs-review alert, launched every 30 min by
# com.lbwalton.jobtrackr-sync.plist.
#
# 1. Triggers GET /api/gmail/sync (Bearer CRON_SECRET from apps/web/.env.local)
# 2. Reads the needs-review queue from /api/emails
# 3. iMessages LB when NEW items appeared since the last run
#
# State (seen email ids) lives in apps/web/data/sync-alert-seen.txt (gitignored).
set -uo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
APP_URL="http://localhost:3001"
ENV_FILE="$REPO/apps/web/.env.local"
STATE_FILE="$REPO/apps/web/data/sync-alert-seen.txt"
IMESSAGE_TO="+17025210284"

# App not running (Mac just booted, service stopped, etc.) — silently skip.
if ! curl -s -o /dev/null --max-time 5 "$APP_URL/api/jobs"; then
  echo "[$(date)] JobTrackr not reachable, skipping sync."
  exit 0
fi

# launchd fires us every 5 min; the actual cadence is the app's
# "Auto-sync interval" setting (Settings -> Gmail Monitoring), so LB can
# change it in the UI without reloading the LaunchAgent.
INTERVAL_MIN="$(curl -s --max-time 10 "$APP_URL/api/settings" \
  | /usr/bin/python3 -c "import json,sys; print(json.load(sys.stdin).get('syncIntervalMinutes', 30))" \
  2>/dev/null || echo 30)"
LAST_RUN_FILE="$REPO/apps/web/data/sync-alert-last-run"
NOW="$(date +%s)"
LAST="$(cat "$LAST_RUN_FILE" 2>/dev/null || echo 0)"
# 60s slack so launchd firing a few seconds early doesn't skip a whole tick.
if (( NOW - LAST < INTERVAL_MIN * 60 - 60 )); then
  exit 0
fi
echo "$NOW" > "$LAST_RUN_FILE"

CRON_SECRET="$(grep '^CRON_SECRET=' "$ENV_FILE" | cut -d= -f2-)"
if [[ -n "$CRON_SECRET" ]]; then
  echo "[$(date)] Triggering Gmail sync..."
  curl -s --max-time 290 -H "Authorization: Bearer $CRON_SECRET" \
    "$APP_URL/api/gmail/sync" >/dev/null || echo "  sync call failed (continuing)"
fi

# Needs review = has a suggestedStatus that hasn't been applied (inbox definition).
NEW_ITEMS="$(curl -s --max-time 15 "$APP_URL/api/emails" | /usr/bin/python3 -c "
import json, sys, os

state_file = '$STATE_FILE'
seen = set()
if os.path.exists(state_file):
    seen = set(open(state_file).read().split())

emails = json.load(sys.stdin).get('emails', [])
pending = [e for e in emails if e.get('suggestedStatus') and not e.get('statusApplied')]

new = [e for e in pending if str(e['id']) not in seen]

# Persist every pending id (new state) so an item alerts exactly once.
os.makedirs(os.path.dirname(state_file), exist_ok=True)
with open(state_file, 'w') as f:
    f.write(' '.join(str(e['id']) for e in pending))

for e in new:
    who = e.get('jobCompany') or e.get('fromAddress', '?')
    print(f\"{who}: {e.get('subject','(no subject)')} -> suggests {e['suggestedStatus']}\")
")"

if [[ -n "$NEW_ITEMS" ]]; then
  COUNT="$(echo "$NEW_ITEMS" | wc -l | tr -d ' ')"
  MSG="JobTrackr: ${COUNT} new email(s) need review
${NEW_ITEMS}
Open: $APP_URL/inbox"
  echo "[$(date)] Alerting: $COUNT new needs-review item(s)."
  osascript - "$IMESSAGE_TO" "$MSG" <<'APPLESCRIPT'
on run argv
    tell application "Messages"
        set targetService to 1st service whose service type = iMessage
        set targetBuddy to buddy (item 1 of argv) of targetService
        send (item 2 of argv) to targetBuddy
    end tell
end run
APPLESCRIPT
else
  echo "[$(date)] Nothing new needs review."
fi
