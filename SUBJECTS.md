# SUBJECTS.md — Plexus per-subject rendering and validation

How Plexus renders and verifies content in each subject: the interaction primitives, the technologies that draw them, and the validators that prove them correct before a learner ever sees them. Companion to `CONTEXT.md` (Plexus and the cost economy), `DESIGN.md` (how surfaces look), and `VIDYA.md` (how she reads and annotates them). This file is law for the content substrate.

Initial content focus per the locked instructions: mathematics, the three sciences, and social science (not languages). The vertical-slice atom is linear equations (math). Computer science is part of the designed palette and sequenced per the build order below. All six subjects share one substrate.

---

## 1. How to hold this

Two gates govern every piece of content: **correctness** (it is never wrong) and **feel** (Brilliant-grade, smooth, buttery, beautiful — built for school students). Everything below serves those two gates.

One principle makes the whole thing buildable by a small team: **the model authors validated, structured scene specs — it never draws pixels.** The scene spec is the intermediate representation; renderers turn it into interactive components; the validator proves it correct; Vidya reads the same scene state to tutor over it. One substrate, every subject.

- **Spec contract:** Pydantic → JSON Schema → generated TypeScript types. One contract; backend and frontend cannot drift.
- **Concepts, not board paths:** content is keyed to board-agnostic concepts; boards are mappings over those concepts, so a new board is nearly free and every artifact is reused across learners and overlapping boards (the cost economy in `CONTEXT.md`).
- **Generation is async, never the spinner:** Fable 5 orchestrates, Opus 4.8 generates inside the pipeline; a course is generated with notification when ready, so quality never competes with latency. Generated content is verified, cached, and reused. Claude Code builds the machine; it is not the runtime generator.

## 2. The two validator archetypes

The variable that sets difficulty per subject is how machine-checkable "correct" is. That forces exactly two validators:

- **Computational validator** — CAS, code execution, simulation. Proves answers right deterministically. Already ours.
- **Fact base** — a curated, NCERT-aligned knowledge base that validates descriptive content. For biology and social science, **the fact base is the solver.** The NCERT catalogue (157 chapters / 604 topics / ~3,500 items) is that ground truth. This is a real, owned build item — no fact base, no reliable biology or history.

**The interpretive boundary.** Essays, argument, and source analysis are never auto-generated as open response. Express interpretive work as structured primitives (match, order, MCQ) or leave it to humans. We do not ship what we cannot verify.

## 3. The doctrine — defer the tax, reveal the invisible

Every subject has a tax (the friction that kills confidence — notation, syntax, memorization, dryness) and an invisible truth (the thing worth seeing — why an operation works, how data flows, what a force does). The engine defers the tax and reveals the invisible.

| Subject | Tax we defer | Invisible we reveal | Render with | Validate with |
|---|---|---|---|---|
| **Math** | Notation, abstraction | Why operations work; quantity; the algebra↔geometry link | Mafs, JSXGraph, D3 | SymPy (CAS) |
| **Computer Science** | Typing, syntax | Execution, state, data flow, logic | Monaco / CodeMirror + Pyodide / WASM, D3 | Run the code — strongest validator |
| **Physics** | Equations | Forces, fields, energy, causation | Rapier, custom canvas, circuit engine, Mafs | Sim ground truth + SymPy + dimensional analysis |
| **Chemistry** | Unseeable abstraction | Structure, bonding, reactions, electrons | RDKit-js, 3Dmol.js / Kekule.js, custom labs | RDKit, balance checker, stoichiometry |
| **Biology** | Memorization | Living processes, systems, scale, time | SVG, Three.js, custom, Remotion | Genetics computational; rest vs. fact base |
| **Social Science** | Dryness, distance | Change over time, space, human systems, tradeoffs | MapLibre + D3-geo, timelines, D3, SVG | Economics computational; facts vs. fact base |

## 4. The signature formats per subject

| Subject | Signature formats | Difficulty |
|---|---|---|
| **Math** | Geometry, graphs, number lines, area proofs, probability | Easiest — crisp answers everywhere |
| **Computer Science** | Live code editors, algorithm / DS visualizers, recursion trees, logic gates, Parsons problems | Easiest — correctness by execution |
| **Physics** | Simulations (projectile, circuits, waves, optics, forces) with live sliders; free-body diagrams | Medium — sims must be physically exact |
| **Chemistry** | Molecule builders / 3D viewers, equation balancing, arrow-pushing mechanisms, titration labs, stoichiometry | Medium — structure / balance crisp; mechanisms need rule sets |
| **Biology** | Drag-label diagrams, sequence processes, punnett squares, food webs, 3D anatomy, taxonomy trees | Medium-high — crisp interactions, factual correctness |
| **Social Science** | Interactive maps, timelines, event-ordering, labeled structures, supply / demand curves | Highest variance — split by strand |

## 5. Per-subject deep dive

### Math — home turf
Geometry, graphs, number lines, area proofs, probability. Render with **Mafs** and **JSXGraph** (heavy draggable Euclidean geometry) plus **D3** for plots. Validate with **SymPy** (CAS answer-checking). Crisp answers everywhere; this is where the pipeline and the feel bar are proven first. (GeoGebra is eliminated — JSXGraph + Mafs + Three.js / R3F only.)

### Computer Science — teach the thinking; typing is a late reward
The trap is dropping a full IDE on a twelve-year-old — a blank editor with a blinking cursor is where confidence dies. The ramp:
- **Block assembly** — snap labeled blocks together; drag `repeat 3`, watch a robot walk three tiles. Zero syntax, pure structure. The entry primitive.
- **Parsons problems** — correct lines, shuffled; drag into order. All the logic, none of the typing. Add a wrong distractor line and you teach debugging. Scales Class 6 → 12 by using harder code.
- **The execution visualizer (the crown jewel)** — code on one side; the machine's mind made visible on the other: the current line glowing, variables as labeled boxes whose values animate on change, the loop counter ticking, the call stack growing and shrinking, step forward / back and scrub the timeline. Recursion draws itself as a tree; a sort becomes bars physically swapping.

Render with **Monaco / CodeMirror + Pyodide / WASM** execution and **D3** for visualization. Validate by **running the code and checking output** — the strongest validator of all.

### Physics — the killer format is simulation
Projectile motion, circuits, waves, optics, forces with live parameter sliders (change angle → see trajectory), free-body diagrams. Render with **Rapier** (deterministic mechanics), a **custom canvas** for fields and waves, a **circuit engine**, and **Mafs** for graphs. Validate with **simulation ground truth + SymPy** for closed-form + **dimensional analysis**. A wrong constant ships a wrong mental model, so sims must be physically exact, not merely plausible.

### Chemistry — make the unseeable visible
Molecule builders and 3D viewers (rotate structures), interactive equation balancing, arrow-pushing mechanisms, titration labs, stoichiometry. Render with **RDKit-js** (2D / SMILES), **3Dmol.js / Kekule.js** (3D), and **custom lab sims**. Validate with **RDKit** for structural validity, a **balance checker** (conservation is deterministic), and **computed stoichiometry**. Structure / balance / stoichiometry are crisp; reaction outcomes and mechanisms need curated rule sets or the model hallucinates wrong chemistry.

### Biology — the shift from solve to understand
Less "solve," more structure and process: drag-label diagrams (cell, heart, plant), sequence the steps of mitosis or digestion, punnett squares, food webs, 3D anatomy, taxonomy trees. Render with **SVG** (the workhorse), **Three.js** (anatomy), custom components (punnett / food-webs), and **Remotion** (process animation). Validate genetics computationally; validate the rest against the **fact base**. Interactions are crisp primitives (label / sequence / classify), but "correct" is factual — only as trustworthy as the fact base.

### Social Science — reveal change over time and space
Split by strand. Interactive maps, timelines, event-ordering, labeled structures, supply / demand curves. Render with **MapLibre / Leaflet + D3-geo**, timeline components, **D3**, and **SVG**. Economics is nearly as crisp as math and validates computationally; geography validates against geo-data; history and civics lean on the **fact base** for dates, places, sequences, and structures.

## 6. The video pipeline

Short explanatory videos per sub-topic or activity, high-craft animation, narration in sync. **Remotion is the primary engine** — it reuses our own React components and brand, so videos look like the product. **Manim is retained only for heavy symbolic / notation-heavy math animation.** An offline pipeline feeds the cache; videos are not rendered at runtime. Narration via Google TTS (canonical). Complex bio and structural imagery SVG cannot express is filled by Gemini / Nano Banana.

## 7. The full technology reference

| Layer | Technology |
|---|---|
| Spec contract | Pydantic → JSON Schema → generated TypeScript types |
| 2D math / geometry | Mafs (+ JSXGraph for heavy draggable Euclidean geometry) |
| Plots / functions | Mafs / D3 |
| 3D | Three.js + react-three-fiber (R3F) |
| Physics / labs | Rapier (deterministic) + custom canvas + circuit engine |
| Chemistry | RDKit-js, 3Dmol.js / Kekule.js, custom lab sims |
| Code execution (CS) | Monaco / CodeMirror + Pyodide / WASM |
| Maps / geo (social) | MapLibre / Leaflet + D3-geo |
| Diagrams / process | SVG (workhorse) + Remotion for animation |
| Video | Remotion primary; Manim for notation-heavy math only |
| Answer validation | SymPy (CAS) + code execution + simulation ground truth + the fact base |
| Reachability validation | Playwright (headless) |
| Shell / overlays / handwriting | React (web) / React Native + Reanimated + Gesture Handler (Expo); Caveat for handwritten annotation |
| Generation | Fable 5 orchestration, Opus 4.8 generation, via the model router — async, inside the pipeline, never the spinner |
| Backend / store | FastAPI + Supabase; specs versioned as source of truth |

## 8. Build order — decisive

1. **Math + CS first** — crispest validators; prove the whole pipeline and the feel bar end to end.
2. **Physics + Chemistry** — add simulation and domain engines.
3. **Build the fact base, then Biology + Social Science together** — they share the knowledge-base validator.

Do not start with biology or history: that builds the fact base before the pipeline that consumes it.

## 9. What would kill it — anti-patterns

- Letting the model freehand lessons instead of authoring validated scene specs.
- Keying content to board paths instead of concepts (kills the reuse economics).
- Letting Vidya act on pixels instead of code-level scene state (kills grounding — see `VIDYA.md`).
- Shipping a subject before its validator exists (a wrong constant or a wrong date is existential).
- Auto-generating interpretive open response instead of structured primitives.

Avoid these and this is a buildable, compounding, and beautiful content system — an execution problem, not a research one.
