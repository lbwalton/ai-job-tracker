#!/bin/bash
# JobTrackr always-on web server (production build), launched by
# com.lbwalton.jobtrackr.plist with KeepAlive. Logs to apps/web/data/logs/.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO/apps/web"

# launchd does not read zshenv/nvm init — put the nvm node on PATH explicitly.
NODE_BIN="$(ls -d "$HOME/.nvm/versions/node"/*/bin 2>/dev/null | tail -1)"
if [[ -z "$NODE_BIN" ]]; then
  echo "ERROR: no nvm node found" >&2
  exit 1
fi
export PATH="$NODE_BIN:$PATH"

# Refuse to double-bind if something already serves the port (e.g. a manual
# `npm run dev`). KeepAlive would otherwise crash-loop against the busy port.
PORT=3001
if lsof -i ":$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Port $PORT already in use — assuming JobTrackr is running elsewhere. Sleeping."
  # Sleep instead of exiting so launchd doesn't thrash restarting us.
  exec sleep 86400
fi

exec npm start
