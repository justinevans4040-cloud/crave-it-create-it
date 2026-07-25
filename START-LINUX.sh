#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20 or newer is required." >&2
  exit 1
fi
( sleep 2; command -v xdg-open >/dev/null 2>&1 && xdg-open http://localhost:4173 >/dev/null 2>&1 || true ) &
npm run dev
