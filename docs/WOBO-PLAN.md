# Wobo — the build plan

Dated 2026-09-02. Owner: Shreyan. Orchestrator: Fable. This plan is the working contract between the owner's vision (recorded in `CONTEXT.md`, `DESIGN.md`, `WOBO.md`, `WOBO-CAPABILITIES.md`, `MOTION.md`, `DECISIONS.md`) and the code. Where this plan and an older law conflict, this plan wins and the law is amended in `DECISIONS.md`.

Task tracking lives in `docs/WOBO-TASKS.md`. Both files are updated at the end of every wave.

---

## 0. North star

Wobo is a tutor who thinks on a board while she talks, for every child on every syllabus, free by default. She is present on every screen, reads what the learner points at, and answers by drawing. The category reference is Brilliant.org; the bar is above it: playful in the character, professional in the chrome, flawless in execution.

Non-negotiables carried from the laws: one hit of pigment per view, no shadows, sentence case, no emoji, no exclamation marks in product copy; consent and age are capability doors; no generated fact reaches a child unverified; the learner's data is theirs and deletable.

## 1. Architecture: companion and brain

**Wobo (the companion)** is the face, senses, hands and voice. She runs in the client and has full access to the nervous system. She has no intelligence of her own beyond choreography and never holds a credential, a key, a model name, or a limit.

**The brain** is the gateway (`services/gateway`) and the services behind it. It decides everything: which model, what budget remains, what the learner is allowed at their consent tier, what content to compose, what she may remember, what is safe to say. Free limits are enforced here and only here.

**The nervous system** (client, `packages/wobo` + `apps/web-pwa/src/wobo`):

- **Surface registry.** Every screen registers what is on it with a semantic id, a description, and the actions it supports. Shaped like WebMCP's `registerTool` so it is browser-compatible when Chrome ships it. No screenshots of our own UI, ever.
- **Scene bus.** Every interactive publishes live state (values, last action, correct model) and accepts tutor actions. Already law; the audit found seven engines with the ref never attached. Fixed in Wave 3.
- **Gesture layer.** One transparent layer over the app captures selection, circling, hover-and-hold, long-press, a desktop hotkey, and turns each into a structured focus object: the exact elements inside, their text and numbers, the owning component's state.
- **Ink renderer.** One app-wide SVG layer that draws Wobo's strokes and the learner's, anchored to registry targets, never to pixels.
- **Context packet.** Per turn: focus, screen state, route, task state, the learner's mind summary, the last turns, under a token budget.

**The seam** is the capability registry. One capability, `wobo.turn`, carries the context packet up and streams speech, ink, and actions back down. Mobile and desktop shells call the same seam unchanged.

**White-label rule.** Nothing user-facing names Classess, Claude, Gemini, OpenAI, Google, or any provider. Model ids never leave the brain. Provider errors are rewritten to Wobo's voice.

## 2. The board

The board is the medium of every explanation. The brain streams a drawing plan the way it streams words; her hand draws it stroke by stroke, timed to her voice. All SVG, generated from her own thought, exact because every number is computed by code.

**Three presentations, one grammar, one renderer:**

1. **Ink on the screen.** She draws on and around whatever is there: a paused video, an outline, a setting, a sim. Anchored to what's on screen; fades like a whiteboard.
2. **The plane.** A frosted, translucent board slides in from her orb and floats over the current screen. Movable, resizable, pinnable, minimizable to a thumbnail with its ink intact. A sheet on phones. Summonable by gesture or by saying "board". Its ink persists until wiped.
3. **The full board.** Inside a lesson the board is the screen.

Her rule: a pointer or one line stays on screen; a derivation or a diagram from scratch gets the plane; a lesson gets the full board. The learner can override with a word.

**The grammar** (streamed, compact): point, circle, underline, arrow, bracket, strike, number, write, erase, wipe, and shape primitives: line, polyline, curve, polygon, ellipse, axis, grid, table, label, tex, bond, atom, arrowhead, region. Every object has an id and can be re-pointed, moved, faded, or redrawn later. Layout hints only; a layout engine places objects so nothing collides.

**Domain pipelines under the grammar:** graphs and constructions from the installed math libraries; molecules from SMILES through RDKit into stroke order a chemist would draw; equations rendered to paths so she genuinely writes them; physics diagrams from computed geometry; maps and cells from the existing scene specs. Every quantity passes the verifier (CAS, dimensional analysis, balance checks) before it is drawn.

**Feel:** pen physics with anticipation and settle, chalk or marker aesthetics per theme, the pen sound, handwriting in Caveat letter by letter, ink that fades, an eraser swipe, a fresh board. She points before she says "this".

**Bidirectional:** the learner draws on the same board; she reads their ink; moving her tangent updates her numbers. Stylus on tablets.

**The artifact:** a board has a timeline to scrub, saves to notes, and exports as a shareable image. This is the proof loop.

**Latency:** the pen starts within a second. The plan streams ahead of speech; first strokes are drawn before the first sentence finishes.

**Migration of engines:** the thirty bespoke engines become idioms of the board over time. A slider bound to a variable is a sim; a blank region with a question is a workbook. Existing engines keep working until each is absorbed.

## 3. The companion

**Senses:** screen (registry + bus), gesture (focus objects), learner (account, consent tier, mastery per topic, recent mistakes, preferred analogies, last ten turns).

**Hands:** point, act. "Show me" glides a visible cursor to the real control. "Do it" executes under the permission ladder: recommend, prepare, execute with permission, safe automatic. Anything that communicates, buys, submits, or deletes asks first.

**Voice:** push-to-talk on the orb and a desktop hotkey. No always-listening for minors. Accent follows the learner's country; American English is the fallback.

**Modes:** explain this, show me, do it, quiz me, check my work, why is this wrong, say it in my world (analogy), read it aloud, teach it back to me.

**Proactive:** when the bus shows three wrong drags or forty idle seconds, the orb leans in and offers a pointer. Governed by the quiet/balanced/proactive dial.

**Memory:** what she remembers is set by the consent tier, enforced in the brain, visible and erasable on a memory page.

**Horizons after the core:** snap a homework page and she grades the working; handwriting canvas with math recognition; code-switching across Hinglish and vernacular; parent mode narrating the week; vision fallback for content we did not make.

## 4. Curriculum

**Registry of boards and curricula.** A searchable global list with aliases, country, levels, and official sites: national boards, every Indian state board, NIOS, IB, Cambridge, Edexcel, AP, US states, UK nations, Australian states, Canadian provinces, common homeschool programmes. Drafted, then verified, then extended by discovery.

**Not listed? Type it and she looks.** A discovery job searches for the official syllabus, fetches it, extracts the outline into our schema, cross-checks with a second model and structural checks, and saves it to the global database as provisional with provenance. The learner sees it at once with an honest label. Promotion to verified after checks pass; owner review available.

**Nothing found? They bring their own.** Paste, type, photo, PDF. She structures it into a personal syllabus and builds the plan. Optionally offered to the global database as community-contributed, moderated.

**Ontology, versioned by academic year:** framework, version, level, subject, unit, topic, learning objective; provenance on every node; CASE export mapping. Never overwritten, only new versions. A freshness crawler watches official pages and diffs new releases; Wobo tells the learner what moved.

**Editable overlay.** Add, remove, reorder, "not in my school", attach a textbook. Edits live on top of the canonical version.

**On demand at every level.** Chapter list on selection, topics on open, content on open, cached and shared across boards through the canonical concept graph.

**Scope:** grades 4 to 13 wherever a board has them; school level only.

Replaces the static catalog file and the fragile "frame" system.

## 5. Content and evaluation, board-native

**Visual by default (owner law, 2026-09-03).** Pretty much everything is visual. Brilliant.org is the bar and ours is higher: their visuals are authored once for everyone; ours are drawn live, for this learner, on their own syllabus, and they can be circled, dragged and asked about. Every explanation is a board drawing, a simulation, a diagram, a graph, a construction, an animation, or an interactive; text is the caption of a visual, never the lesson. A lesson beat with no visual object is a defect, and the golden-board suite asserts that every beat carries at least one drawn object. Where a visual would not help (a definition, a name), it stays one short line beside the thing it names, never a paragraph.

Courses, practice runs, mini-workbooks, flashcards, boss battles, the daily thread, XP, the knowledge twin all stay. Each becomes board-native: a quiz is Wobo asking on the board and grading the working; a boss battle is a live problem she draws and you solve on the same surface; feedback is ink on the mistake.

Evaluation upgrades: free-reasoning grading of text, voice, and handwriting; the assistance ladder that visibly fades; the "I think I'm right" re-grade; the calibration harness against human-graded sets; misconception detonation from the learner's own numbers. The audit's grading bugs are fixed in Wave 3.

## 6. Experience

**Landing page.** The board's first performance. A chalk cursor with a fading ink trace in WebGL; Wobo alive in a shader hero, eyes following the cursor; scroll-driven lesson where she draws as you scroll; a live mini-board the visitor can type into; then calm editorial sections: every board on earth, the parent's weekly artifact, pricing annual-first, the invitation. Lazy-loaded, fast on cheap phones, honours reduced motion.

**Auth and legal.** Login and sign-up (Google, phone OTP), terms, privacy, user agreement, cookie and consent notice, parental consent flow for minors, deletion path. Drafted in full to DPDP and children's-data requirements; lawyer review before launch.

**Onboarding, the first five minutes.** Intro (done), then sign in first (Google or phone OTP; the account carries the name). Then one question: what are you studying right now? Text, voice, or a photo. She infers board and class; one tap confirms. Then the aha: she teaches one real thing on the board. Then the guided tour: Wobo walks the learner through what they can do and how, Clicky-style, pointing at the real controls (the thread, Learn, Practice, the board, the plane, asking by circling, push-to-talk), with the learner trying each. Three quick questions light the map. Interests fold into the first analogy. Board picker is a search with a "not listed? show me your syllabus" path. Returning learners see nothing. (Owner decision 2026-09-02: sign-in before the aha, not after.)

**UI raise.** One design pass through every surface against `DESIGN.md`, with Brilliant as the floor. Poppins for UI, Caveat for her hand. Fixes from the audit folded in: tokenised surfaces in both themes, one hit of pigment, chat on the home front door, reduced motion honoured, the twin as hero art, illustration and empty states with craft. Two or three screens shown to the owner before rollout.

## 7. Platforms

Web first. Store apps for iOS and Android, phones and tablets, via Capacitor (owner confirmed 2026-09-02): same codebase, native camera, microphone, push, gestures. Desktop via Tauri when wanted. No React Native rewrite; the SVG, canvas and WebAssembly engines are the asset. The empty Expo workspace becomes the Capacitor project when that wave arrives.

## 8. Operations

- Config is brand-neutral: hostnames, sender addresses, and titles come from environment, so the domain swap is one change. Until the owner buys a domain the app lives on the default Vercel URL.
- Commit and push at the end of every wave (standing permission). Deploy once towards the end, on green.
- Keys: the deploy ignore files must exclude `.env*` explicitly (Wave 2). Precautionary rotation of provider keys recommended before launch.
- Supabase project `keepraxqagzgjrrweryt` is paused; restoring it is an owner dashboard action unless the CLI is authorised.
- CI runs on `the-life`, builds the web app, runs unit and Playwright suites, and the Python suites, every push.

## 9. Model routing and cost (owner directive 2026-09-02)

Development: Fable orchestrates, designs (all UI and creative direction is Fable's hand), and writes the crown jewels; Opus does the bulk; Sonnet the cheap labour. Unrelated waves run simultaneously as dynamic workflows when their files do not overlap.

In product, the brain routes by tier, never by name to the user. Generation runs on OpenAI's GPT-5.6 family; the latest Claude models cross-check and carry the conversation; Gemini stays as is for voice and imagery. Cheaper models take everything basic. Prices are per million tokens as of September 2026 (Sol $5 in / $30 out; Terra $2 / $12; Luna $0.20 / $1.20).

| Tier | Jobs | Primary | Fallback |
|---|---|---|---|
| tiny | intent classification, routing, safety pre-screen, titles and summaries, alias and catalog matching, packet compression | `openai/gpt-5.6-luna` | `anthropic/claude-haiku-4-5` |
| turn | Wobo's conversational turns, on-screen explanations, hints, "why is this wrong" | `anthropic/claude-sonnet-5` | `openai/gpt-5.6-terra` |
| generate | board plans, lessons, practice items, workbooks, syllabus extraction, discovery jobs | `openai/gpt-5.6-terra` | `anthropic/claude-opus-5` |
| reason | synthesis boss battles, misconception detonation, first extraction of a new board's syllabus, grading escalations | `openai/gpt-5.6-sol` | `anthropic/claude-opus-5` |
| verify | second-opinion cross-check of anything generated (always the other provider); math goes through CAS first | `anthropic/claude-opus-5` | `openai/gpt-5.6-terra` |
| voice | live voice, streaming TTS | Gemini 2.5 Flash native audio (unchanged) | — |
| image | imagery SVG cannot express | Gemini 2.5 Flash Image (unchanged) | — |

**The cost rule (owner, 2026-09-02): generation goes to the cheapest model that passes verification and escalates only on failure.** Terra by default for every board plan and lesson; Sol only on a verifier or second-opinion rejection or for the hard list (synthesis bosses, misconception detonation, first extraction of a new board's syllabus). Sonnet 5 for turns; Opus 5 only as the cross-check and on escalation. Luna and Haiku take everything basic. Every escalation is logged with its reason so the hard list stays honest.

Retired from the router: Claude Opus 4.8, GPT-5.5, GPT-4.1. `claude-fable-5-1` is available on the key but reserved; it is not in the product router until a job proves it needs it. The budget meter counts every tier; free by default with metered usage, upgrade for more; only dummy prices appear in code or screens until the owner sets real ones.

## 10. Waves

Each wave ends with all gates green, a commit, a push, a screenshot proof, and an update to this plan and the task list.

| Wave | Goal | Exit criteria |
|---|---|---|
| 0 | Land the rebrand; restore Supabase | Pushed; sign-in works against the restored project |
| 1 | Lock the brain | Every gateway route authenticated or token-gated; consent tier server-derived; budget meter live; timeouts, caches, limiter fixed; SymPy sandboxed; path traversal closed; live probe shows 401s |
| 2 | Production truth | CSP correct; one vercel.json; Railway config in repo; dead hosts gone; CI on `the-life` running all suites; web tests wired |
| 3 | Main-flow bugs | Every high bug from the audit fixed with a test; per-account scoping; dark-mode literals gone from main surfaces |
| 4 | Repo cleanup | Media untracked, dead packages gone, scripts removed, `.gitignore` complete, history rewrite decided |
| 5 | The nervous system and the board | Registry on every screen; gesture layer; ink renderer with the full grammar; the plane; on-screen ink over a paused video; streaming plans from the brain; verified numbers |
| 6 | Curriculum | Board registry; discovery job; own-syllabus path; ontology with provenance; editable overlay; on-demand generation; grades 4 to 13 |
| 7 | Experience | Landing page; auth and legal; new onboarding; UI raise across every surface; board-native content and evaluation |
| 8 | Platforms and launch | Capacitor apps; store assets; final deploy; launch checklist |
| 9 | Horizons | Homework snap, handwriting canvas, parent mode, vernacular, vision fallback |

Waves 1 to 4 are short and unglamorous; they are the difference between a demo and a product. Waves 5 and 6 are the product. Wave 7 is the release.

## 11. Risks

- **Invented syllabi.** Provenance is mandatory; anything without an official source is labelled draft and editable.
- **Cost of a continuous companion.** The budget meter and the cheap-model router are built in Wave 1, before the companion exists.
- **Board latency.** Streaming plans and drawing ahead of speech; measured on a cheap Android phone, not a laptop.
- **Handwriting quality.** Glyph-to-stroke conversion done properly rather than faked; validated on tablets.
- **Children's data.** Consent tiers enforced in the brain; memory visible and erasable; deletion model implemented, not documented.
- **Scope.** Every wave has exit criteria; nothing starts on ambiguity between waves.

## 12. Owner actions

1. Restore the Supabase project (dashboard) if the CLI path fails.
2. Buy the domain and say the word; the swap is one config change.
3. Rotate provider keys before launch as a precaution.
4. Lawyer review of the legal drafts before launch.
5. Real prices when ready; dummy values until then.
6. A launch date or event, if one exists, so polish is sequenced right.

## 13. Replace, don't patch (owner law, 2026-09-02)

Any UI, code, logic, schema, or structure that is not ours any more or is slated for rebuild is not fixed or polished; it is rewritten better, once, in the wave that owns it. With zero users on the restored database, interim fixes to soon-dead code are waste. Concretely: the old course players, home stops, Learn/Subject/Practice/You screens, the onboarding, the static catalog and "frame" system, the thirty bespoke engines, the chrome components, the dead UI package, and the old content-composer layer of the gateway are superseded by Waves 5 to 7; audit tasks in those files are marked superseded rather than fixed. What survives and is fixed in place: the SDK, the nervous-system substrate (bus, presence, speech), the shell (router, store, download center), the gateway core (auth, routing, registry, voice, safety, email, cache, providers), the verifiers and the cache store, the render worker, contracts, deploy config, CI, and repo hygiene. Security findings are never superseded; they are closed in Wave 1 regardless of the file's future.

## 14. Growth and marketing, built in (owner directive, 2026-09-02)

Marketing is a product surface, not a campaign. Every tactic is behaviour-timed, honest, and aimed at the person who pays, the parent, never at pressuring a child. Uniform pricing for everyone stays law; what varies by behaviour is the **gift**, the timing, and the framing, which keeps us on the right side of the "adapt everything but price" rule and of a children's-product reputation.

- **The parent link.** In settings, a learner (or parent) creates a parent link: a weekly, beautiful, WhatsApp-native progress artifact drawn from the child's own boards. The share page is the upgrade surface: what the child mastered, what Plus would unlock next, one calm button. "Show mom what I just cracked" fires it from a victory.
- **Behaviour-timed offers (gifts, not discounts).** Visited the payment page and left: a gifted Plus week, same for everyone in that state. Cancelling: a save flow with pause, a downgrade, or a gifted month, then a graceful exit with the data-deletion path visible. Strong streak and real mastery: surprise generosity, unannounced free Plus days. Exam season: unlimited weekends to taste then lose. Anniversary and milestones: titles of self, not coupons.
- **Paywall timing.** The ask lands just before the wow it unlocks, at the emotional peak, framed as pushing limits, never on a timer; annual-first; charm pricing; decoy tiers; real numbers only when the owner sets them.
- **Share loops.** The challenge loop (share a hard problem, never the answer, WhatsApp-native) for acquisition; the proof loop (the board as a branded mastery image) for credibility; referrals rewarded in learning, not cash.
- **Lifecycle.** Email, push, and WhatsApp on progress moments: welcome, first aha, first board saved, first boss, streak with taste, win-back after seven quiet days, exam-calendar surges. Preferences, unsubscribe, no schedule-driven nagging.
- **Acquisition.** Programmatic SEO pages per board, class, subject and chapter with a live mini-board on each; the landing page as the board's first performance; app-store optimisation; build-in-public; velvet-rope invites with insider lore at launch.
- **The engine underneath.** Every lever flaggable and A/B-testable; the adaptive tactic engine selects copy, reward type, framing and timing per archetype; attribution and cohort retention tracked; a fraud and integrity layer on referrals and sponsored seats.
- **Compliance rails.** Marketing consent lives with the parent for minors; DPDP-clean; no dark patterns in cancel flows; every message has an off switch.

## 15. Every element earns its place (owner law, 2026-09-03)

User experience is one of the highest priorities. Everything on every page must make sense and have a valid reason to be there. Valid reasons are three: it serves a learner task; it carries the brand or the character (the cool factor, the moment that makes someone smile, Wobo doing something delightful); or it is simply nice to have there and someone can say why. What goes is the irrelevant: leftovers, chrome nobody would miss, controls that duplicate another, copy that explains nothing. Concretely: for every screen we ship, an element inventory names each visible thing (control, label, chip, card, line of copy, animation) with its reason in one of the three kinds; anything without one is removed, not restyled. One screen, one intention (DESIGN.md law 1); the simple thing first, depth on request (law 6). Copy is written from the learner's side of the screen and says exactly what happens. Every wave's QA includes this audit; the Wave 7 UI raise starts from the inventory, not from the existing layout. The owner reviews the inventory for the main surfaces before rollout.
