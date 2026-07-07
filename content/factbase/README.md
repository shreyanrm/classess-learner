# content/factbase — the NCERT-aligned fact base

For biology and social science there is no CAS to prove a date, a name, or a sequence right.
The fact base **is** the solver (SUBJECTS.md §2). It is a versioned, append-only knowledge base of
atomic, provenance-carrying facts that the post-serve validation gate checks generated bio/social
content against before promotion.

## Files

- `facts.v1.jsonl` — the base. One JSON fact per line (see schema). Only `confidence:"verified"`
  facts are queried at runtime.
- `review-queue.v1.jsonl` — candidate facts where the two models DISAGREED. Never used at runtime;
  awaits human adjudication. Written by `build.py --live`.
- `build.py` — the builder/pipeline (seed from catalogs + Opus→GPT-5.5 candidate pipeline).

## Schema (one line = one atomic fact)

```json
{
  "id": "<sha1(conceptId|claim)[:16]>",
  "conceptId": "<board-agnostic slug, == store.concept_id for the topic>",
  "claim": "<one self-contained assertion, sentence case>",
  "kind": "definition | process-step | date | place | structure | relation",
  "subject": "science | social",
  "source": { "...provenance..." },
  "confidence": "verified | unverified",
  "check": { "entity": "Dandi March", "value": "1930", "kind": "year" }   // OPTIONAL
}
```

- **conceptId** is the same key the runtime resolves for a topic (`store.concept_id` → `_slug`), so
  the gate can look up a concept's facts directly. Chapter/ordering facts are keyed by the chapter
  slug; topic definition/date facts by the topic slug.
- **source** records provenance. Catalog-seeded: `{type:"catalog", file, board, grade, subject,
  provenance}` (the catalog's own per-subject provenance string). Model-verified:
  `{type:"model-verified", models:[opus, gpt-5.5], verifierReason}`. A candidate before verification
  carries `{type:"model-generated-unverified", model}`.
- **confidence** — `verified` only after cross-model agreement (or catalog provenance). Candidates
  start `unverified`; a disagreement is written to the review queue, never silently kept.
- **check** — present only when the fact has a machine-checkable atom (a year/number). This is what
  `plexus/factcheck.validate_claims` uses for a deterministic contradiction check.

## How it is built

1. **Seed from what we own (deterministic).** `build.py` extracts structural facts from the verified
   board catalog (`content/catalogs/cbse.json`): every CBSE class 9–10 science/social chapter and
   topic, their order, and each topic's blurb — all `verified` with catalog provenance.
2. **Candidate pipeline (`build.py --live`, offline).** For each CBSE-10 bio/social topic, Opus
   generates atomic candidate facts (`model-generated-unverified`); GPT-5.5 independently verifies
   each; only **agreements** promote to `verified`. Disagreements go to `review-queue.v1.jsonl`.
   Run offline by an operator — it needs API keys and never runs at request time.

```
python content/factbase/build.py          # rebuild facts.v1.jsonl from catalogs (deterministic)
python content/factbase/build.py --live    # + Opus→GPT-5.5 candidate pipeline
```

## The runtime gate

`plexus/factcheck.py` plugs into `plexus/validate.py` AFTER the technical lint and BEFORE promotion,
for `science`/`social` subjects only:

- `validate_claims(artifact, conceptId)` → deterministic contradictions (a proven wrong year beside
  a named entity). Any contradiction is treated as a CRITICAL correctness failure, forcing the
  GPT-5.5 rebuild + best-of.
- `facts_for(conceptId)` → the verified claims, handed to the LLM judge as ground truth so it can
  catch the looser factual errors (wrong definition, wrong sequence).

## Honest scope — v1

- **Breadth:** CBSE class 9–10 biology (inside "science") and social science only. Biology is not a
  standalone subject id at this grade; it lives in "science", so the gate fires for either.
  Expansion **per board** (and to other grades) follows the same builder — each board catalog is
  another `extract_catalog_facts` input; nothing here is CBSE-specific except the seed path.
- **Seed content:** structural facts (chapter/topic names, orderings) are the owned coverage base.
  The richer, learner-facing dated/defined facts come from the `--live` candidate pipeline, which
  has not been run in this commit (no keys in CI). Running it appends verified facts + populates the
  review queue.
- **Deterministic check:** `validate_claims` fires only on facts carrying a `check` with a
  year/number. Looser factual correctness (definitions, sequences) is delegated to the LLM judge via
  `facts_for` — deliberately, because a deterministic contradiction check on prose would false-flag
  correct content. The judge, not a brittle string matcher, adjudicates those.
