#!/usr/bin/env bash
# The three brand gates (WOBO-PLAN §17, §19), run in one go. `bun run gate` calls this.
#
#   no-classess   the old brand, or the `clss-` identifier prefix, anywhere
#   white-label   a provider / model / vendor name where a user can see it
#   pronouns      a gendered pronoun within 60 characters of "Wobo"
#
# Every one of them runs even if an earlier one fails, so a single run tells you everything that
# is wrong rather than one thing at a time. Exits non-zero if any gate failed.
#
# white-label reads apps/web-pwa/dist, so build the web app first:
#   cd apps/web-pwa && bun run build
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1

status=0
for gate in no_classess white_label pronouns; do
  python3 "scripts/gate_${gate}.py" || status=1
done

exit "$status"
