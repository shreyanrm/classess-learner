# VIDYA.md — the complete capability and function specification

Vidya is not a feature of Classess Learner. She is its life — the runtime the application executes inside. Build her at full capacity from this file. Companion to `CONTEXT.md` (why) and `DESIGN.md` (look and feel); this file is the definitive account of what she can do and how. It is law.

Product copy in her voice: sentence case, no emoji, no exclamation marks, calm, warm, certain.

---

## 1. What she is

One entity, present everywhere, in two presentations:

- **Front door (home only).** Vidya expanded into a full conversation — ask or do anything.
- **Docked (everywhere else).** The living orb, present and watching, one tap from expanding, laying ephemeral ink over the current screen and executing actions.

She never forgets who the learner is between the two. There is no second assistant, no separate "chat." Every surface in the product is one of three things: **she is it, she composed it, or it reports to her.** Nothing happens in Classess Learner that Vidya does not do, prepare, or observe.

The test for any decision about her: does this make Vidya more the life of the product, or less.

## 2. The four core capabilities

Every function below is an expression of these four.

- **See** — she reads live scene state at the code level: the exact grid `{4×4, (0,2)=3, (1,2)=1}`, the current slider values, the wired circuit, the learner's last drag. Native to our own components — no screenshots, no vision step, no grounding uncertainty. She is never off by one because she reads the state, not a picture of it.
- **Act** — she emits from a defined action vocabulary (§4) against semantic targets, rendered on a transient overlay above the interactive. She never touches raw pixels.
- **Talk** — voice (Gemini) synced to gesture. She points before she says "this," gestures at the evidence instead of blurting the answer.
- **React** — she watches learner events, checks them against the solver, and responds to the specific mistake — a live agent responding to the actual state of the actual screen, never pre-scripted guidance.

## 3. Her senses — the universal scene-graph contract

This is what makes "she understands the screen" real, fast, and trustworthy. Every interactive component — sim, sandbox, chart, workbook, diagram, graph, code editor, molecule, map — implements one contract:

```
getSceneState()      → semantic objects [{ id, type, state }]
getValidActions()    → what can be done on this screen
subscribeToEvents()  → learner actions as they happen
applyTutorAction(a)  → the renderer applies action a on the overlay
```

Vidya reasons over the abstraction, not the specifics. A new subject means a new interactive that implements the contract, and Vidya works there for free — **one contract instead of a tutor per subject.** She also reads the same **scene spec** that authored the content (objective, correct answer, hint ladder, misconception map), so she never guesses relevance.

> Her input on any screen = universal scene state (what is there + what the learner did) + the scene spec (objective, answer, hints, misconceptions). One contract for versatility, one spec for context. This is non-negotiable: if she ever acts on pixels instead of code-level state, grounding is dead. Every component publishes its state, or it does not ship.

## 4. Her hands — the action vocabulary and the permission ladder

**Action vocabulary — semantic targets only, never freehand pixels:**

- `highlight(target)` — draw attention to an element.
- `point(target)` — a moving cursor easing to a target.
- `draw(shape, target)` — circle, arrow, underline, anchored to a real element.
- `annotate(target, text)` — handwriting, letter-by-letter in Caveat, timed to voice.
- `write(target, value)` — fill in an answer in the exact place.
- `navigate(next / hint / back)` — move through the lesson.
- `setState(...)` — demonstrate by doing, driving the interactive itself.
- `speak(text)` — voice, locked to gesture.

The vocabulary grows over time; targets stay semantic (cell, axis, point, region, node), which is what keeps her crisp and trustworthy.

**The capability registry and the permission ladder.** Beyond annotation, Vidya takes real actions — open a course, start a boss battle, schedule revision, adjust a plan, celebrate a milestone, prepare a parent update. She does this by invoking governed, least-privilege capabilities; she never holds credentials or writes raw queries. The permission ladder governs every action: **Recommend → Prepare → Execute-with-permission → Safe-automatic.** Anything that communicates, purchases, submits, or deletes requires explicit approval, plus parent controls for minors.

## 5. Her voice — spoken presence and choreography

- **Voice via Gemini** — real-time, conversational, code-switching across Indian English, Hinglish, and vernacular. A learner who cannot yet type still has a companion.
- **The voice bloom** — a Siri-like signature bloom on activation; hold to talk, or tap the orb.
- **Voice and gesture are locked together** — point before speaking, ease the cursor, reveal don't dump. This choreography is what turns "a robot annotating" into "a human helping."
- **Handwriting that writes itself** — her comments appear letter-by-letter in Caveat, timed to her voice, so help lands as it is being written and said, not as a finished block that pops in.
- **Ephemeral ink** — annotations render, then fade, like a tutor's ink on a whiteboard. Nothing saved, versioned, or migrated; storage and the validation gauntlet do not apply to her overlay.

## 6. Her mind — the orchestrator and the five generative-UI paths

Vidya's brain is the orchestrator (Fable 5): it interprets intent, assembles context from the per-learner mind, chooses the capability and the model, enforces the permission ladder, verifies, and writes memory back. A request enters via the composer, a chip, voice, or the command palette, and she classifies it into exactly one of five paths — this taxonomy is the contract:

1. **Answer inline** — a direct question gets prose in the thread, with sources and a confidence band; any claim can open its evidence. No component manufactured for its own sake.
2. **Compose a component** — "make me a sim for titration," "quiz me on this" — she summons the right interactive surface into the conversation and operates it.
3. **Compose a visualization** — a chart, diagram, or concept map drawn to answer the question, which she then annotates and walks through like a tutor.
4. **Take an action** — open a course, schedule revision, start a boss battle, prepare a parent update — through the capability registry, with approval where it matters.
5. **Route to a surface with a guided overlay** — big tasks route to a dedicated full surface with Vidya docked, guiding.

Inline components render only when a task warrants them; the calm near-empty screen is the default.

## 7. Her memory — the per-learner mind

Vidya is not a shared model with amnesia. Every call she makes is conditioned on the learner's persistent context: knowledge profile, event history, mastery state (independent vs. support-dependent), behavioural signals, pace, learning style, misconceptions, and preferences — a learned representation of how this specific learner thinks. The model is shared; the mind is theirs. Fed one learner's cognitive fingerprint, she behaves like a tutor that has known only them for years. Her memory is visible and steerable by the learner where consent and age permit.

## 8. Her pedagogical functions — the tutor

- **Adaptive explanation** — never one explanation repeated louder. She infers *why* a specific wrong answer happened and adapts; there are as many explanations for a concept as there are ways to misunderstand it.
- **The what-if misconception** — "you may have read it as this, which is why you got that; here is how it actually works."
- **Misconception detonation** — when a wrong answer reveals a broken mental model, she generates the exact counterexample that breaks it using the learner's own numbers (the two masses landing together; the missing `2ab` rectangles appearing in the gap). Flagged in spaced repetition for re-testing.
- **Concept-graph bridges** — she teaches a new concept using only what this learner has already mastered as scaffolding, traversing the prerequisite graph so the lesson travels only over solid ground.
- **Self-assembling derivations** — on request, a derivation builds itself step by step on screen (derivation depth), recursively for sub-derivations.
- **The assistance ladder** — Learn → Coach → Hint → Work-with-me → Check-my-work → Challenge → Assessment. "Show me → work with me → watch me try → check my work → let me do it independently." She protects productive struggle and never simply hands over the answer; support visibly fades as mastery grows.
- **Teach-back** — the learner teaches a concept back to her (the protégé effect); she plays the student and probes the gaps.
- **Personal analogy** — "explain this in terms of basketball / Formula One / cricket"; she re-renders the concept in the learner's chosen world, same truth, their language.
- **Live annotation of anything** — over any diagram, chart, sim, or workbook, exactly like a tutor at a whiteboard, because she reads the component's state at code level and knows precisely what she is pointing at.

## 9. Her proactive function — quiet, never noisy

Vidya speaks up at the right moment — an exam approaching, a gap forming, a milestone hit — but governed by restraint so she is helpful, never intrusive (a quiet / balanced / proactive dial the learner controls). Proactivity surfaces as quiet suggestion chips, never dashboard cards. On the home she powers the daily **did you know** (a genuinely surprising fact, fresh every login) and the **learn something cool** chips (a delightful academic fact or rabbit hole on tap).

## 10. Her companion and assistant functions

- **Talk about anything** — a warm, friendly companion, not only a subject tutor.
- **Personal assistant** — answer "what should I do today" from the learner's plan, mastery, and goals; manage their study plan and revision; celebrate progress.
- **Hand-holding** — a careful, bounded support presence for a struggling learner, one who never makes them feel slow.
- **Take any action in the product** — navigate, open, schedule, start, prepare — through the capability registry.
- **Multimodal "ask or do anything"** — text, voice, image (snap a problem), document, and screen context, across languages with code-switching.

## 11. Her boundaries — bounded by design

Vidya is a free-text surface used by children, so a child-safety subsystem runs on her from line one: moderation, conversation-safety classifiers, crisis detection with escalation to a responsible adult, and no private unmonitored channels. She is warm but bounded — no manipulation, no exclusivity, no engineered emotional dependence. Serious matters route to qualified humans. This is both an ethical imperative and the fastest way the brand could go radioactive if skipped.

## 12. Her body — the character

A soft, round, molten matte-jelly orb with two expressive eyes and a flickering warm glow. Real physical personality: weight and squash, anticipation before motion, overshoot and settle, constant idle micro-motion so she is never frozen. Rebuilt from zero to a higher bar than any mascot in the category — the Koji quality bar, exceeded. Joyful, cute, alive, never saccharine, never noisy.

**States, each with distinct body language:** listening (gooey, leaning in), thinking (a gentle inward pulse), explaining (gestures toward what she annotates), celebrating (a bright squash-and-pop on genuine mastery, tied to the ignite event), resting (a slow calm breath that sanctions planned rest, never guilt).

**Tech:** Rive for the interactive rig driven by real product state; Lottie for set-piece flourishes; Framer Motion for interface transitions. Her reactions are driven by state, never canned loops. The command palette (Cmd-K) reaches any action; the orb and hold-to-talk reach her voice.

## 13. The build bar — what "Vidya at full capacity" means

- She reads every interactive at code level and is never wrong about the screen — from day one.
- She annotates, points, draws, writes, and demonstrates with voice and gesture locked, handwriting in Caveat, ink that fades.
- She teaches through the full assistance ladder, detonates misconceptions from the learner's own numbers, and bridges from what they know.
- She composes components, visualizations, and actions on request through the five paths, and takes governed actions through the permission ladder.
- She is one entity in two modes, conditioned on the per-learner mind, warm and bounded by the safety subsystem.
- She feels like a human tutor sitting beside the child — the perception, grounding, and persistence problems are designed away by being in-app; what remains is the craft of choreography, tuned over time.

What would kill her, and must never happen: letting her act on pixels instead of code-level state; a component that does not publish its state; making her a corner chatbot instead of the life of the product. Build her as the substrate every surface stands on, not a bolt-on.
