# DESIGN.md — Wobo, how it looks, feels, and behaves

Companion to `CONTEXT.md`. This file governs every visual and interaction decision. It is law. When a screen could belong to a generic edtech app, it has failed — rebuild it.

Product copy everywhere: sentence case, no emoji, no exclamation marks, calm and certain.

---

## 1. The standard — restraint is the positioning made visual

The whole category is red-urgency noise. We are the opposite: calm, spacious, certain. Calm is a status signal and the antidote an anxious learner is starving for. Premium feel is a load-bearing psychological lever, not decoration — processing fluency makes learning feel achievable. The reference class is a product where every pixel was argued over. European-minimal, not decorated-minimal: steel and one hit of pigment.

## 2. Brand tokens — build as code tokens, never generic defaults, never Tailwind base styles

**Color.** Black and white carry the entire interface. Colour appears only where it means something.
- Ink scale on white (and inverse on dark surfaces): near-black `#0D0D10` through the grays.
- **Ultramarine `#1F35E0`** — the signature pigment, reserved for brand and mastery. This is "ignite" at rest.
- Accent family, used rarely and with intent: molten `#FF5A1F`, magenta `#CC1E7A`, acid `#66B300`. A pop of vibrant colour where a moment earns it — never a rainbow.
- The rule: one hit of pigment per view. If two things are shouting, one is wrong.

**Type.** Google Sans Flex for all product UI — no other UI typeface. Brand and document system (marketing, the vision docs) may use Fraunces, Inter, JetBrains Mono, and Caveat as a sparse handwritten accent.

**Surfaces & depth.** No shadows, ever. Depth comes from 0.5px hairlines, tonal surface steps, and frost on overlays only.

**Corners.** Sharp. 3px default radius (`radius-sm`).

**Density.** Generous whitespace. The screen breathes. Emptiness is the premium signal in a category of clutter.

## 3. The ten design laws

1. One screen, one intention, one next-best-action.
2. Calm on the surface, intensity underneath — the intelligence works hard; the interface never shouts.
3. No shadows — depth via hairlines, tonal steps, frost.
4. One hit of pigment per view; ultramarine reserved for brand and mastery.
5. Animate meaning, never chrome.
6. Progressive disclosure — the simple thing first; depth on request.
7. Every generated visual is glanceable — understood at a glance or it is redrawn.
8. Wobo is present but never in the way — expanding when summoned, contracting when not.
9. The aha is precious — the ignite event is scarce, earned only by genuine comprehension.
10. Built to be screenshotted — the twin and mastery artifacts are hero art by default.

## 4. Wobo (the tutor) — the life, not a layer

Wobo is one name for both the app and the tutor inside it; this section is about the tutor. Wobo is the runtime the app executes inside. Every surface is one of three things: Wobo is it, Wobo composed it, or it reports to Wobo. See `CONTEXT.md` for the architecture; this is how Wobo looks and behaves.

**The body.** A soft, round, molten matte-jelly orb with two expressive eyes and a flickering warm glow. Wobo has real physical personality — weight and squash, anticipation before motion, overshoot and settle. Constant idle micro-motion so Wobo is never frozen. Rebuilt from zero to a higher bar than any mascot in the category: the Koji quality bar, exceeded. Joyful, cute, alive — never saccharine, never noisy.

**States, each with distinct body language:**
- **Listening** — gooey, leaning in, softened edges.
- **Thinking** — a gentle inward pulse.
- **Explaining** — gestures toward what Wobo annotates.
- **Celebrating** — a bright squash-and-pop on genuine mastery, tied to the ignite event.
- **Resting** — a slow calm breath, used to sanction planned rest (anti-streak), never to guilt.

**The two modes — one entity, two presentations:**
- **Front door (home only):** Wobo expanded into a full conversation. Ask or do anything.
- **Docked (everywhere else):** the orb, present and watching, one tap from expanding, laying ink over the current screen, executing actions. Wobo never forgets who the learner is between the two. There is no second assistant.

**Code-level screen awareness.** Wobo does not screenshot the screen. Every interactive component publishes its live state to a shared bus Wobo reads directly — Wobo knows the exact circuit on the board, the current slider values, the last drag. This is why annotation is exact and responsive. See §12, the component contract.

**Tech.** Rive for the interactive rig driven by real product state; Lottie for set-piece flourishes; Framer Motion for interface transitions. Wobo's reactions are driven by state, never canned loops. Voice via the Gemini path — a signature voice bloom on activation.

## 5. The motion system — animate meaning

Named, GPU-friendly, eased, always meaningful, never decorative.

- **Signature primitives:** **ignite** (a region catching light the moment something is genuinely mastered) and **constellation-ignite** (the twin lighting a region and its connections).
- **Motion-lab defaults:** rise-fill, fill-wipe, spotlight, border-draw.
- **The aha is a multisensory event** — a signature sub-second sound plus haptic (where supported) that fires only on genuine comprehension. Scarcity makes it precious; it never fires for routine taps.
- **Meaning, animated:** a misconception shattering, scaffolding fading, a derivation self-assembling, the two missing `2ab` rectangles sliding into the gap. Never animate chrome for its own sake.
- **Micro-interaction character:** magnetic buttons (cursor-attracted within a small radius, subtle and physical), tactile press states, butter-smooth expansion. Playful and cute lives in Wobo and in motion; the chrome itself stays disciplined. The tension to hold: a five-year-old finds it friendly, a parent finds it serious — achieved by restraint plus one living character, never by decorating the chrome.
- **Transitions:** the smallest transitions matter — weight, bounce, position, settle. Nothing snaps; everything eases with physical logic.

## 6. Navigation — one screen, one intention

The generic left navigation is dead. Navigation is intention-first: say it to Wobo, tap one of a very small set of doors, or open the command palette.

- **No persistent rail** on the home. `Today / Learn / Create / Progress` from the conscience docs are a reference model, not gospel — in this app the home is deliberately narrower (see §7). Create and Progress live behind Wobo and the quiet "you" affordance.
- **Command palette (Cmd-K)** reaches any action in the product.
- **Wobo** reaches any surface by voice or text — so the small set of visible doors never limits what a learner can do.

> If Shreyan later wants a slim contextual rail inside Learn or course contexts only, that is the one place it may return. It never appears on home.

## 7. The home — radically minimal

On landing, the learner sees almost nothing. That emptiness is the premium signal.

```
┌─────────────────────────────────────────────┐
│  ◦ you                          ✦ did you know │
│                                               │
│              ◍  Wobo                          │
│         "ask me anything, or…"                 │
│                                               │
│   ┌───────────────────────────────────────┐   │
│   │  talk to Wobo…                        │   │
│   └───────────────────────────────────────┘   │
│      [ ✧ learn something cool ]  · chips       │
│                                               │
│         ┌──────────┐   ┌──────────┐            │
│         │  Learn   │   │ Practice │            │
│         └──────────┘   └──────────┘            │
└─────────────────────────────────────────────┘
```

- **Wobo, front door** — the conversation, centre stage. Chat lives only here; everywhere else is the docked orb.
- **Did you know** — top right, a genuinely surprising fact that changes every single day, fresh on every login.
- **Learn something cool** — shortcut chips under the chat bar that prompt Wobo to surface a delightful academic fact or rabbit hole on tap.
- **Learn / Practice** — the two doors, under the chat bar.
- **You** — a whisper-quiet affordance, top left, opening the twin, profile, past courses, and settings. Never a menu bar.

## 8. Screen behaviour

**Learn & Practice — the subject grid.** Both open to the learner's subjects in a clean, tactile grid; one tap into a subject, then chapters, then topics (a topic is a course). The **custom courses** the learner asked for sit below the syllabus grid under a "courses" heading. **Completed courses** move out of the active grid into a "past" shelf — a trophy case, not a to-do list. Practice additionally opens the free-play sandbox and the mixed practice surfaces.

**The course player — where Wobo docks.** Inside a course, content-type surfaces render full-bleed and Wobo contracts to the docked orb: present, reading the screen at code level, one tap from expanding, ready to annotate or answer "why is this wrong." The player is the guided-discovery shell — one idea per screen, act-to-reveal — closing on the boss battle, the greeting, and the XP.

**Prerequisite gates.** A topic whose prerequisites are unmastered shows the suggestion and a "proceed anyway" door — a gate is advice, never a wall. Gating is scoped to where the learner started (a grade-10 entrant is never sent to grade 9).

**Progress — the twin as hero.** The knowledge twin is its own surface and the emotional centre of retention (§11).

**Parent — the absolution engine.** Not a dashboard. A weekly, beautiful, WhatsApp-native artifact drawn from the child's own learning — a short video, a shareable page, or a graph, in the parent's language — a visual projection of who the learner is becoming. The child can trigger "show mom what I just cracked." See `CONTEXT.md` §12.

## 9. Content-type UX — the taxonomy, and how each looks and behaves

We are visual-first: animation, simulation, and graphics are the highest priority; text is the fallback, never the default. Wobo composes which types a topic uses and in what order, tuned to the concept and the learner.

**The keystone — build first.**
- **Guided-discovery interactive** — the Brilliant format and the format gap in edtech: one idea per screen, tap / drag / slide to reveal, zero lecturing. A reusable shell every other engine targets. If one thing is built perfectly, it is this shell.

**Interactive & simulated — the core.**
- **Simulators, everywhere** — click, drag, feel. Titration where drops shift colour transparent → pink → deep pink; circuits where you wire bulbs, cells, capacitors freely; reactions, the periodic table, lab experiments. If a concept can be felt, it is a sim.
- **Free-play sandbox** (practice) — an open area to build anything on a topic, no task, Wobo watching at code level.
- **Perturbation sandbox ("break it")** — expose the parameter where a law fails as a slider. Drag resistance to zero in `V=IR`; current diverges; "why not in reality?" surfaces internal resistance. Understanding a model is knowing where it stops working.
- **What-if sandbox** — every numerical is editable. Drag the person's height or distance to the tower in a heights-and-distances problem and the figure and the worked solution below update live. Numericals are never static.
- **Mini-games & arcade** — where a concept is better practised as play, a mechanic that *is* the concept.
- **Visual compare** — animal cell vs plant cell, series vs parallel — side-by-side, interactive, genuinely beautiful, correspondences and differences animated, not tabulated.

**Explanatory & visual.**
- **SVG diagrams** — every diagram is SVG, glanceable, and annotatable by Wobo. For complex biological or structural imagery (plant cell, human body), image generation (Gemini / Nano Banana) fills what SVG cannot.
- **Animated visuals** — animated SVG and motion sequences; meaning animated, chrome never.
- **Charts & graphs** — drawn in SVG, beautiful, and tutored: Wobo highlights, annotates, and walks the curve like a teacher, because Wobo reads the plot's data at code level.
- **Concept maps** — where a web of relationships needs showing, drawn from the real graph, structural not decorative.
- **Explainer videos** — short motion pieces, as long as the topic needs (ten seconds to two minutes), high-craft animation with Google TTS narration in sync. An offline pipeline feeding the cache, not runtime rendering.
- **Podcasts** — audio lectures for learning and revision, generated from the same verified content, voiced through the TTS pipeline.

**Depth on demand — shown only if asked.**
- **Derivation depth** — formulas carry an info button; tap it and the full derivation unfolds as a dropdown ("how we got here"). Recursive as sub-derivations in algebra and calculus. Most move on; the curious go deep without cluttering everyone.
- **Word-problem breakdown** — any word problem opens into a step-by-step visual dissection on request: the scene drawn, quantities labelled, the path made visible.
- **Personal analogy** — "explain this in terms of basketball / Formula One / cricket"; Wobo re-renders the concept in the learner's chosen world, same truth, their language.
- **Correlations** — when a concept the learner has *already mastered* connects to a new one, Wobo surfaces the link; if unmastered, the link stays hidden. Relevance is tactical, never noise.

**Practice & assessment surfaces.**
- **Mini-workbooks in-lesson** — short interactive mixes inside a course (match-the-following, fill-blanks, quick quizzes) for hands-on checks without leaving the flow.
- **Flashcards** — where recall matters, wired into spaced repetition.
- **Boss battle (end of topic)** — a full interactive digital workbook that closes a topic. The learner works through it, is evaluated, and only then receives the closing greeting and the XP. The engaging climax of a course.
- **Synthesis boss (cross-topic)** — a live problem assembled from everything the learner has mastered, drawn across topics via the graph.

**The two behaviour-triggered crown jewels.**
- **Misconception detonation** — triggered by a wrong answer, not a topic. Generate the exact sim that breaks the belief using the learner's own numbers (the two masses landing together; the missing `2ab` rectangles appearing in the gap). Not a generic "common mistakes" box: "you just said X — watch X break." Flagged in FSRS for re-testing.
- **Concept-graph bridge** — teach a new concept using only the concepts *this* learner has already mastered as scaffolding. Look at the edges into the target, intersect with their mastered set, generate a lesson that travels only over solid ground. Same destination, different bridge per learner. Graph traversal plus generation — nothing new authored.

**Beyond syllabus — optional delight.**
- **Mystery lessons** — hidden, optional lessons on a completed topic, something genuinely cool and out of syllabus, discovered not assigned, rewarded with XP.
- **Bonus lessons** — optional extensions for XP; sanctioned rabbit holes via bridges from where the learner stands.

## 10. Math & rendering

JSXGraph + Mafs for 2D math and graphing; Three.js / R3F for 3D and explorable models. GeoGebra is eliminated. Every diagram is SVG-first and glanceable; Gemini / Nano Banana only for imagery SVG cannot express. All rendered content is annotatable by Wobo through the component contract.

## 11. The knowledge twin as hero art

The twin is the product's signature icon and the emotional centre of retention. Treat it as generative hero art that breathes and **ignites** a region the moment something is mastered. It shows not just lit versus dark but **independent versus support-dependent** mastery. Queryable in plain language ("what am I weakest at," "what unlocks astrophysics"). Built to be screenshotted and shared. Every conclusion in it links back to its evidence.

## 12. The component contract — non-negotiable

Every interactive component (sim, sandbox, chart, workbook, diagram) must:
- **Publish its live state** to the shared bus Wobo reads — current values, the learner's last action, the correct model — so Wobo annotates and reasons at code level, never by vision. This is what makes Wobo fast, exact, and responsive. Build it into every component from the first one.
- **Expose an annotation layer** Wobo can draw over — highlight, circle, point — anchored to real elements, not screen coordinates.
- **Emit an attributed event** on every meaningful learner action, feeding mastery, gaps, and the twin (see `CONTEXT.md` §5).
- **Degrade gracefully offline** — pre-synced learning packs keep the core interactive experience alive on a dead network.

## 13. The review test — what "not generic edtech" means

Before any screen ships, ask: could this belong to a generic edtech app? If yes, it fails. The signals of failure: a persistent nav rail, dashboard cards of raw numbers, explain-first video-with-a-quiz, shadows, more than one hit of pigment, chrome that animates for no reason, Wobo reduced to a corner chatbot. The signals of the standard: calm and spacious, one intention per screen, meaning animated, Wobo alive and central, the aha earned and precious, the twin worth screenshotting.
