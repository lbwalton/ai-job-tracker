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

# Self-heal before starting. Two outages seen 2026-09-07:
#   1. node_modules deleted while running -> any request carrying a cookie 500s
#      with "Cannot find module 'next/dist/compiled/cookie'".
#   2. better-sqlite3 native addon built for a different Node ABI ->
#      ERR_DLOPEN_FAILED / NODE_MODULE_VERSION mismatch on DB routes.
# Reinstalling every boot would be slow, so we only act when something is
# actually broken. npm runs with the nvm node above on PATH, so any native
# rebuild targets the ABI this server will actually run under. On failure we
# exit non-zero and let launchd retry (ThrottleInterval handles the backoff),
# which recovers on its own once the network / toolchain is back.
if [[ ! -d "$REPO/node_modules/next" || ! -d "$REPO/node_modules/better-sqlite3" ]]; then
  echo "self-heal: node_modules incomplete — running npm install"
  if ! ( cd "$REPO" && npm install ); then
    echo "self-heal: npm install FAILED (network down?) — launchd will retry" >&2
    exit 1
  fi
fi

# A plain require dlopens the native addon, so this catches an ABI mismatch
# (e.g. after an nvm upgrade) even when node_modules is present.
if ! node -e "require('better-sqlite3')" >/dev/null 2>&1; then
  echo "self-heal: better-sqlite3 won't load — rebuilding for $(node -v)"
  if ! ( cd "$REPO" && npm rebuild better-sqlite3 ); then
    echo "self-heal: npm rebuild better-sqlite3 FAILED — launchd will retry" >&2
    exit 1
  fi
fi

exec npm start
