#!/bin/sh
set -e

# The node_modules volume is seeded from the image only on first creation;
# reinstall when package-lock.json has changed since then.
LOCK_HASH="$(sha256sum package-lock.json | cut -d' ' -f1)"
if [ "$(cat node_modules/.lock-hash 2>/dev/null)" != "$LOCK_HASH" ]; then
  echo "[entrypoint] package-lock.json changed, running npm ci..."
  npm ci
  echo "$LOCK_HASH" > node_modules/.lock-hash
fi

exec "$@"
