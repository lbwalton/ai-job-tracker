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
