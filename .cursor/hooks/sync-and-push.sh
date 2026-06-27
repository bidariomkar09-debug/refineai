#!/usr/bin/env bash
# Runs after Cursor agent completes — build, commit, push to main.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# Skip if not a git repo
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

# Skip if nothing changed (including unstaged)
if git diff --quiet && git diff --cached --quiet; then
  exit 0
fi

bash "$ROOT/scripts/sync-and-push.sh" "chore: auto-sync after agent changes" || {
  echo "sync-and-push failed (non-fatal for hook)" >&2
  exit 0
}
