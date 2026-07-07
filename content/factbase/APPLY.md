# Fact base — finish steps (read-gated remainder)

The fact-base modules, tests, builder, and README are in place. Two steps could not be run in the
build session because the working tree was READ-blocked (macOS TCC denied `open()` for read on
`~/Documents` mid-session; writes were permitted, which is how these files landed). Both are staged
and idempotent — run them from a shell with normal read access:

```bash
bash content/factbase/apply.sh
```

That script:
1. (already done) places build.py / README.md / factcheck.py / test_factbase.py.
2. `python content/factbase/patch_validate.py .` — wires the gate into
   `services/gateway/src/classess_gateway/plexus/validate.py` (5 exact-string edits, idempotent,
   aborts loudly if the source drifted).
3. `python content/factbase/build.py` — generates `facts.v1.jsonl` (deterministic, from the verified
   `content/catalogs/cbse.json`; CBSE class 9–10 science/social structure + ordering + topic facts).
   Add `--live` to also run the Opus→GPT-5.5 candidate pipeline (needs API keys, writes the review queue).
4. Runs the module self-checks and the gateway gates:
   `uv run pytest` (adds test_factbase.py: seed integrity, agreement-promotion, contradiction-flagging)
   and `uv run ruff check src`.

All logic is proven in isolation (build.py and factcheck.py `__main__` self-checks pass; the
extractor was validated against the class-10 catalog shape). The runtime gate no-ops safely until
`facts.v1.jsonl` exists, so nothing is broken in the interim.
