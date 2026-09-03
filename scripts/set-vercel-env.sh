#!/usr/bin/env bash
# Sets the Vercel PRODUCTION environment for the web PWA, then reminds you to redeploy.
#
#   bash scripts/set-vercel-env.sh                 # keep the anon key already on Vercel
#   bash scripts/set-vercel-env.sh <anon-key>      # also (re)set the Supabase anon key
#   VITE_SUPABASE_ANON_KEY=<key> bash scripts/set-vercel-env.sh
#
# NO KEY IS COMMITTED IN THIS FILE. This repo is public (DEPLOY.md §0): the anon key is
# publishable, but a committed credential is still a credential, and it would go stale the
# moment the project rotates. With no argument the script leaves whatever anon key the
# project already has and verifies it via `vercel env pull` at the end.
#
# The non-secret flag VALUES are not duplicated here either — they are read from the
# committed apps/web-pwa/.env.production, which DEPLOY.md §0 names as their one source of
# truth. Vercel project env overrides that file at build time, and these must agree
# with it or a production build silently disagrees with the runbook.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$REPO_ROOT/apps/web-pwa"
ENV_FILE="$APP_DIR/.env.production"
cd "$APP_DIR"

command -v vercel >/dev/null || { echo "vercel CLI not found — npm i -g vercel && vercel login"; exit 1; }
[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE"; exit 1; }

# Read one KEY=value out of .env.production (no sourcing: the file is data, not shell).
from_env_file () {
  local val
  val="$(grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2-)"
  [ -n "$val" ] || { echo "$1 is not set in $ENV_FILE"; exit 1; }
  printf '%s' "$val"
}

setv () {
  echo "  setting $1 …"
  vercel env rm "$1" production --yes >/dev/null 2>&1 || true   # remove any prior/empty one
  printf '%s' "$2" | vercel env add "$1" production >/dev/null
}

setv VITE_APP_URL        "$(from_env_file VITE_APP_URL)"
setv VITE_APP_NAME       "$(from_env_file VITE_APP_NAME)"
setv VITE_SUPABASE_PROXY "$(from_env_file VITE_SUPABASE_PROXY)"
setv VITE_SUPABASE_URL "$(from_env_file VITE_SUPABASE_URL)"
setv VITE_GATEWAY_URL  "$(from_env_file VITE_GATEWAY_URL)"
setv VITE_DEV_AUTH     "$(from_env_file VITE_DEV_AUTH)"
setv VITE_PERSIST_MODE "$(from_env_file VITE_PERSIST_MODE)"
setv VITE_LLM_MODE     "$(from_env_file VITE_LLM_MODE)"

ANON="${1:-${VITE_SUPABASE_ANON_KEY:-}}"
if [ -n "$ANON" ]; then
  setv VITE_SUPABASE_ANON_KEY "$ANON"
else
  echo "  VITE_SUPABASE_ANON_KEY: left as-is (pass it as an argument to replace it)"
fi

echo ""
echo "Verifying against Vercel:"
PULLED="$(mktemp)"
trap 'rm -f "$PULLED"' EXIT
vercel env pull "$PULLED" --environment production --yes >/dev/null 2>&1
# Print names and safe values only — the anon key is reported as present/absent, never echoed.
grep -E "^VITE_(DEV_AUTH|PERSIST_MODE|LLM_MODE|GATEWAY_URL|SUPABASE_URL|SUPABASE_PROXY|APP_URL|APP_NAME)=" "$PULLED" || true
if grep -qE "^VITE_SUPABASE_ANON_KEY=.+" "$PULLED"; then
  echo "VITE_SUPABASE_ANON_KEY=<set>"
else
  echo "VITE_SUPABASE_ANON_KEY=<MISSING — live auth will fail; rerun with the key as \$1>"
fi

echo ""
echo "Next: redeploy web (Vercel dashboard → Redeploy) so these take effect."
