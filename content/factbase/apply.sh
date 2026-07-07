#!/usr/bin/env bash
# Apply the fact-base build into the repo, generate the seed, and run the gates.
# Idempotent. Run once repo file access is restored.
set -euo pipefail

REPO=/Users/depl/Documents/classess-learner
SRC=/private/tmp/claude-501/-Users-depl-Documents-classess-learner/6aa90296-d29d-4047-861b-907e346f7b79/scratchpad/fbwork
FB="$REPO/content/factbase"
PLEXUS="$REPO/services/gateway/src/classess_gateway/plexus"
TESTS="$REPO/services/gateway/tests"

echo "== 1. place files =="
mkdir -p "$FB"
cp "$SRC/build.py"     "$FB/build.py"
cp "$SRC/README.md"    "$FB/README.md"
cp "$SRC/factcheck.py" "$PLEXUS/factcheck.py"
cp "$SRC/test_factbase.py" "$TESTS/test_factbase.py"

echo "== 2. patch validate.py =="
python3 "$SRC/patch_validate.py" "$REPO"

echo "== 3. generate the seed (deterministic, from catalogs) =="
python3 "$FB/build.py"
echo "   facts: $(wc -l < "$FB/facts.v1.jsonl") lines"

echo "== 4. module self-checks =="
cd "$REPO/services/gateway"
uv run python -m classess_gateway.plexus.factcheck
uv run python -m classess_gateway.plexus.validate
uv run python -m classess_gateway.plexus.lint

echo "== 5. gateway gates =="
uv run pytest 2>&1 | tail -3
uv run ruff check src 2>&1 | tail -3

echo "== done =="
