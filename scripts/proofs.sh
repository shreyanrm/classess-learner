#!/usr/bin/env bash
#
# The proof run (WOBO-PLAN §18 — device agnostic, handcrafted).
#
# Drives apps/web-pwa/tests/responsive.spec.ts across every route, three widths, both themes and a
# reduced-motion pass, then leaves a screenshot per cell and one summary table behind.
#
# The suite is a MEASUREMENT, so this script does not hide its result: a non-zero exit means the
# app has responsive findings, and the table says exactly which element on which screen. CI can
# gate on it; a UI raise can read it.
#
# Usage:
#   scripts/proofs.sh                 # one pass, four workers
#   scripts/proofs.sh --repeat 3      # three passes, and the findings must be identical each time
#   WOBO_PROOF_DIR=/somewhere scripts/proofs.sh
#
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$ROOT/apps/web-pwa"
WORKERS="${WOBO_PROOF_WORKERS:-4}"
REPEAT=1

while [ $# -gt 0 ]; do
  case "$1" in
    --repeat) REPEAT="${2:-1}"; shift 2 ;;
    --workers) WORKERS="${2:-4}"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

# Machine-independent by default: the repo's own gitignored QA directory. Point WOBO_PROOF_DIR
# somewhere else to collect a run elsewhere.
PROOF_DIR="${WOBO_PROOF_DIR:-$ROOT/shots/responsive}"
export WOBO_PROOF_DIR="$PROOF_DIR"
mkdir -p "$PROOF_DIR"

status=0
prev_fingerprint=""

for pass in $(seq 1 "$REPEAT"); do
  echo "── responsive proof · pass $pass of $REPEAT · $WORKERS workers ─────────────────────────"
  start=$(date +%s)
  (cd "$APP" && bunx playwright test tests/responsive.spec.ts \
      --reporter=list --workers="$WORKERS")
  pass_status=$?
  elapsed=$(( $(date +%s) - start ))
  echo "── pass $pass finished in ${elapsed}s (exit $pass_status) ───────────────────────────────"
  [ "$pass_status" -ne 0 ] && status=$pass_status

  # The determinism gate. Findings are the harness's output; screenshots and timings are not, so
  # only the findings are fingerprinted. Two passes that disagree mean a FLAKY HARNESS — a
  # separate, worse failure than a real finding, and this is where it surfaces.
  fingerprint=$(cd "$PROOF_DIR" && cat ./*.json 2>/dev/null \
    | grep -E '"(check|selector|detail)"' | sort | shasum | cut -d' ' -f1)
  if [ -n "$prev_fingerprint" ] && [ "$fingerprint" != "$prev_fingerprint" ]; then
    echo "FLAKY: pass $pass produced different findings from the pass before it." >&2
    echo "  previous: $prev_fingerprint" >&2
    echo "  this run: $fingerprint" >&2
    exit 1
  fi
  prev_fingerprint="$fingerprint"
done

echo
echo "findings fingerprint: $prev_fingerprint"
echo "report:      $PROOF_DIR/README.md"
echo "screenshots: $PROOF_DIR/<route>-<width>-<theme>.png"
exit "$status"
