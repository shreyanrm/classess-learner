# DECISIONS.md — the decision log

Where `CONTEXT.md` and `DESIGN.md` are silent on a taste call, the open question lands here. Where an engineering call had to be made to keep building, it is recorded here with its reasoning.

---

## Open questions for Shreyan

- **Plexus naming.** `CONTEXT.md` §6 carries the open flag: "Plexus ruled out completely" (spoken) vs "Plexus is the sole content source of truth" (canonical). This build follows the canonical instruction — the content engine exists, from scratch, grounded on the catalogs. Confirm the name.

## Engineering decisions (made to keep building, reversible)

- **2026-07-06 · Typeface.** Google Sans Flex is not distributable via Google Fonts. The UI ships with a self-hosted variable font stack that matches its metrics and voice, declared as `"Google Sans Flex", "Google Sans Text", system-ui` — the moment a licensed Google Sans Flex file is provided, dropping it into `apps/web-pwa/public/fonts/` activates it with zero code change.
- **2026-07-06 · Vidya's rig.** Rive is the target for the production rig; authoring a .riv binary requires the Rive editor. Vidya's body ships as a hand-built SVG + spring-physics rig (Framer Motion) implementing the full state machine (listening / thinking / explaining / celebrating / resting) behind a `VidyaBody` interface — a Rive rig can replace the internals later without touching any consumer.
- **2026-07-06 · Voice.** Gemini Live voice requires `GEMINI_API_KEY` in the gateway environment. The voice path is built and wired; without the key it degrades to text seamlessly (no error surface, per the verification-gate philosophy).
- **2026-07-06 · Catalogs.** CBSE, ICSE, and Telangana State Board catalogs (subjects → chapters → topics, classes 6–10) are generated from model knowledge of the official syllabi and marked `provenance: "model-knowledge"` pending verification against official documents. All other boards are listed as doors with on-demand fetch, per the directive.
- **2026-07-06 · The one pigment.** DESIGN.md reserves ultramarine `#1F35E0` for brand and mastery; the old 14-accent subject palette is retired. All mastery ignites are ultramarine; molten stays Vidya's alone (identity lock updated to the law hex `#FF5A1F`, tests updated); magenta and acid await earned moments.
- **2026-07-06 · XP economy (v1).** item 10 · boss 80 · topic 150 · account 50 · profile photo 20 · invite friend/parent 40 · mystery 60 · bonus 45. One-time awards guarded by onceKey. XP is presentation currency only — mastery truth stays in the evidence→band pipeline; no new event types were added to the immutable contract.
- **2026-07-06 · Route IA.** onboarding · home (front door) · learn · practice · subject(id, intent) · course(topicId) · sandbox(topicId?) · progress · you. No persistent rail anywhere; ⌘K palette + Vidya reach everything.
- **2026-07-06 · Did-you-know.** Served from a curated seed list rotating deterministically by day (fresh daily per the directive); live-generation via the gateway can replace the list without UI change.
- **2026-07-06 · Catalog verification source.** Khan Academy's NCERT-aligned course trees (e.g. khanacademy.org/math/ncert-math-class-9-new) are the sanctioned cross-check for the generated catalogs (owner directive). Verification pass queued for a Sonnet labor agent; catalogs keep `provenance: model-knowledge` until it runs.
- **2026-07-06 · Graphics system.** No stock illustration. Generative "concept sigils" (deterministic geometric line-art per topic id, igniting ultramarine on mastery), hand-drawn subject glyphs, chapter filigrees, and empty-state constellations — `apps/web-pwa/src/ui/art.tsx`. Art is identity, not decoration, and scales to every topic with zero assets.
