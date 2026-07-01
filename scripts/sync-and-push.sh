#!/usr/bin/env bash
# RefineAI deploy script: validate build, sync DB migrations note, commit & push to main.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> RefineAI sync-and-push"

# --- Database migrations (Supabase, not Alembic) ---
# Schema lives in supabase/schema.sql and supabase/migrations/
# Apply manually in Supabase SQL Editor, or use: supabase db push
if command -v supabase >/dev/null 2>&1; then
  echo "==> Supabase migrations (Alembic equivalent)..."
  supabase db push --linked 2>/dev/null || echo "    (skipped: run 'supabase login' && 'supabase link --project-ref YOUR_REF' to auto-push)"
else
  echo "==> Supabase migrations (Alembic equivalent)..."
  npx supabase@latest db push --linked 2>/dev/null || echo "    (skipped: run 'supabase login' && 'supabase link --project-ref YOUR_REF' to auto-push)"
fi

# --- Build gate ---
echo "==> Running production build..."
npm run build

# --- Git: never commit secrets ---
if git check-ignore -q .env.local 2>/dev/null; then
  : # ok
else
  echo "WARNING: .env.local is not gitignored!"
fi

git add -A
git reset HEAD .env.local 2>/dev/null || true
git reset HEAD .env*.local 2>/dev/null || true

if git diff --cached --quiet; then
  echo "==> No changes to commit"
else
  MSG="${1:-chore: sync RefineAI changes}"
  git commit -m "$MSG"
  echo "==> Committed: $MSG"
fi

echo "==> Pushing to origin/main..."
git push origin main

echo "==> Done. Vercel will auto-deploy from main."
