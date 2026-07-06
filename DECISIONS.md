# DECISIONS.md — the decision log

Where `CONTEXT.md` and `DESIGN.md` are silent on a taste call, the open question lands here. Where an engineering call had to be made to keep building, it is recorded here with its reasoning.

---

## Open questions for Shreyan

- **Plexus naming.** `CONTEXT.md` §6 carries the open flag: "Plexus ruled out completely" (spoken) vs "Plexus is the sole content source of truth" (canonical). This build follows the canonical instruction — the content engine exists, from scratch, grounded on the catalogs. Confirm the name.

## Engineering decisions (made to keep building, reversible)

- **2026-07-06 · Typeface.** Google Sans Flex is not distributable via Google Fonts. The UI ships with a self-hosted variable font stack that matches its metrics and voice, declared as `"Google Sans Flex", "Google Sans Text", system-ui` — the moment a licensed Google Sans Flex file is provided, dropping it into `apps/web-pwa/public/fonts/` activates it with zero code change.
- **2026-07-06 · Vidya's rig.** Rive is the target for the production rig; authoring a .riv binary requires the Rive editor. Vidya's body ships as a hand-built SVG + spring-physics rig (Framer Motion) implementing the full state machine (listening / thinking / explaining / celebrating / resting) behind a `VidyaBody` interface — a Rive rig can replace the internals later without touching any consumer.
- **2026-07-06 · Voice.** Gemini Live voice requires `GEMINI_API_KEY` in the gateway environment. The voice path is built and wired; without the key it degrades to text seamlessly (no error surface, per the verification-gate philosophy).
- **2026-07-06 · Catalogs.** CBSE, ICSE, and Telangana State Board catalogs (subjects → chapters → topics) are generated from model knowledge of the official syllabi and marked `provenance: "model-knowledge"` pending verification against official documents. All other boards are listed as doors with on-demand fetch, per the directive.
