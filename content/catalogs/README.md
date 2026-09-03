# content/catalogs — inventory

Every file here is either **wired** (loaded by code at build or run time) or a **deliberate
unwired input** (sourced data held for a named piece of work, kept with its provenance).
Nothing here is dead weight, and nothing new should land without a row in this table.
`services/gateway/tests/test_deploy_config.py` enforces that: a JSON file that is neither
referenced in code nor listed below fails the suite.

Wave 6 changed what reads this directory. `docs/CURRICULUM.md` §10 deletes the client's static
catalog and its "frame" system, so the board catalogs below are no longer read by the app at all.
What a learner studies now comes from the registry in `content/curriculum/` — 268 frameworks and
the syllabi stored beneath them, each node carrying its own source — served on demand by the
gateway's `curriculum.*` capabilities. The files here are kept as sourced inputs, not as a
shipping catalog, and none of them is a fallback the app may quietly fall back to.

## Wired

| File | Read by | Notes |
|---|---|---|
| `cbse.json` | `content/factbase/build.py` (`build_from_catalogs`) | Class 4–12; seeds the fact base offline, not served to a learner |
| `concepts.json` | `services/gateway/.../plexus/store.py` (`PLEXUS_CONCEPTS_PATH`); `services/gateway/.../curriculum/concepts.py` | the concept-id registry — the canonical graph board topics map onto (CURRICULUM.md §7); **ships in the gateway image** (`services/gateway/Dockerfile`) |

## Deliberate unwired inputs

| File | Why it is kept | What would consume it |
|---|---|---|
| `icse.json` | A real sourced CISCE catalog (Class 6–10). Superseded as a serving path by `content/curriculum/syllabi/icse/`, which carries a source URL and a document hash per chapter. | nothing further; a cross-check when the ICSE syllabi are promoted from provisional to verified |
| `isc.json` | A real sourced CISCE senior-secondary catalog (Class 11–12 only), same council as `icse.json`. | the same cross-check, against `content/curriculum/syllabi/isc/` |
| `ap.json`, `karnataka.json`, `maharashtra.json`, `telangana.json` | Sourced state-board catalogs (Class 6–10). These four boards are exactly the ones whose portals will not serve a plain fetch, so their curriculum files are stored blocked with a reason rather than filled in. | the discovery job's browser-backed fetch path (CURRICULUM.md §4.2); until then they are held, never served, because their provenance is not per chapter |
| `boards-master.json` | The raw board facts for all 44 boards (id/name/type/country/region/tier + `existingCatalogId`). Its own header documents the integration contract and what was deliberately **not** ingested. | superseded for board choice by `content/curriculum/frameworks.seed.json`; kept for the `existingCatalogId` mapping between these catalogs and the registry |
| `ncert-textbooks-raw.json` | Owner-supplied NCERT textbook catalog, **UNVERIFIED**. Provenance and the four-step verification TODO are in `ncert-textbooks-raw.provenance.md` beside it. | the real-content pass, after the URLs and codes are verified against ncert.nic.in |
| `reference-structures.json` | Fetched chapter/topic/activity structures from OpenStax and IXL, each with a `fetched:<url>` provenance entry. The cross-check reference for our generated catalogs (`DECISIONS.md` 2026-07-06, catalog verification source). | the catalog verification pass that lifts `provenance: model-knowledge` |

If one of these is ever judged not worth keeping, delete the file **and** its row — do not
leave the row pointing at nothing.
