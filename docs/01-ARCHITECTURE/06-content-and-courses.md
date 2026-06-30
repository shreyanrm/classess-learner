# 06 · Content & Courses (where the actual teaching material comes from)

## The rule
**Plexus is the sole content source of truth.** No static question banks, no purchased content libraries, no hardcoded lessons in
production. Content is **generated against the ontology + the catalogs, verified, then cached and reused.** "Written for you, just now."

## The catalogs (the grounding)
- Plexus is grounded on Indian-board catalogs — **NCERT, ~3,500 items** (the working catalog: ~157 chapters / ~604 topics / ~3,500 items).
- Ingesting the full catalog is a content task in its own right. **For the atom we only need the linear-equations slice** — do not ingest
  everything to prove the atom.
- The **prerequisite graph** (edges between catalog nodes — what must be mastered before what) is an **owned, expert-validated artifact**,
  not an assumption. Plexus may *propose* edges; a validation step confirms them before the mastery engine trusts them. Seed only the
  atom's local edges first.

## How a piece of content is born (the pipeline)
```
ontology node + learner context ──► Plexus generate ──► Verifier (CAS / numeric / re-run sim / 2nd-model) ──►
   confidence gate ──► [pass] cache by (node × modality × difficulty × verification_hash) ──► serve
                       [fail] refuse, fall back to cached verified content
```
- Every served artifact (opener, hint, reveal, practice item, nugget) carries a `verification_hash`.
- The cache **is** tier-1 of the three-tier cost economy: **cache → SLM personalization → frontier bespoke.** Cached content is not
  throwaway scaffolding; it is the warm path that serves most learners at near-zero marginal cost.

## What "course" means here
- A **course** = an ordered sequence of ontology nodes with prerequisites (template door: chapter-as-course; create-anything: compiled
  on demand). Both doors produce the same thing: a verified node sequence the Learn loop teaches.
- Content is **per-node + per-learner-context**, not per-course-document. There is no monolithic "course file" — there are nodes,
  their verified artifacts, and the orchestrator threading them.

## What to SEED for the atom (so the app is fully walkable before live generation)
For **linear equations in one variable**, seed a **verified content set** into the cache (curated or generated-then-frozen, all
verifier-passed):
- The node(s) + their local prerequisite edges.
- A handful of **openers** (active pose prompts, interactive where possible).
- A graduated **hint ladder** per opener (for Vidya to draw from, grounded + verified).
- A set of **practice items** across difficulties (for unaided evidence; IRT-tagged).
- A few **reveals** (a Vidya-annotation script + one or two short nuggets).
This seed set doubles as the permanent tier-1 cache for this topic. It is real content, not a stub.

## Who produces the atom's seed content
This is real work in Phase 1, done by you + Claude (and Plexus once it can generate→verify→freeze). It is **not** something Claude Code
invents freely — generated content must pass the verifier, and correctness is existential. Treat the atom's seed set as a reviewed artifact.
