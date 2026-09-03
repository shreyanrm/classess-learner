# content/catalogs — inventory

Every file here is either **wired** (loaded by code at build or run time) or a **deliberate
unwired input** (sourced data held for a named piece of work, kept with its provenance).
Nothing here is dead weight, and nothing new should land without a row in this table.
`services/gateway/tests/test_deploy_config.py` enforces that: a JSON file that is neither
referenced in code nor listed below fails the suite.

## Wired

| File | Read by | Notes |
|---|---|---|
| `cbse.json` | `apps/web-pwa/src/data/frame.ts` `CATALOG_LOADERS`; `content/factbase/build.py` | Class 4–12 |
| `icse.json` | `frame.ts` `CATALOG_LOADERS` | CISCE, Class 6–10 |
| `ap.json` | `frame.ts` `CATALOG_LOADERS` | Andhra Pradesh SSC, Class 6–10 |
| `karnataka.json` | `frame.ts` `CATALOG_LOADERS` | SSLC, Class 6–10 |
| `maharashtra.json` | `frame.ts` `CATALOG_LOADERS` | SSC, Class 6–10 |
| `telangana.json` | `frame.ts` `CATALOG_LOADERS` | SSC, Class 6–10 |
| `concepts.json` | `services/gateway/.../plexus/store.py` (`PLEXUS_CONCEPTS_PATH`) | the concept-id registry; **ships in the gateway image** (`services/gateway/Dockerfile`) |

A board with no loader row is not broken — `frame.ts` `ensureFrame` routes it through the
unsourceable / fetch-on-arrival path.

## Deliberate unwired inputs

| File | Why it is kept | What would consume it |
|---|---|---|
| `isc.json` | A real sourced CISCE senior-secondary catalog (Class 11–12 only), same council as `icse.json`. Sourced and complete; simply not reachable yet. | one `isc:` line in `frame.ts` `CATALOG_LOADERS` once Class 11–12 boards are switched on |
| `boards-master.json` | The raw board facts for all 44 boards (id/name/type/country/region/tier + `existingCatalogId`). Its own header documents the integration contract and what was deliberately **not** ingested. | the universal-frame board picker — it should read board facts from here rather than from `apps/web-pwa/src/data/catalog.ts` |
| `ncert-textbooks-raw.json` | Owner-supplied NCERT textbook catalog, **UNVERIFIED**. Provenance and the four-step verification TODO are in `ncert-textbooks-raw.provenance.md` beside it. | the real-content pass, after the URLs and codes are verified against ncert.nic.in |
| `reference-structures.json` | Fetched chapter/topic/activity structures from OpenStax and IXL, each with a `fetched:<url>` provenance entry. The cross-check reference for our generated catalogs (`DECISIONS.md` 2026-07-06, catalog verification source). | the catalog verification pass that lifts `provenance: model-knowledge` |

If one of these is ever judged not worth keeping, delete the file **and** its row — do not
leave the row pointing at nothing.
