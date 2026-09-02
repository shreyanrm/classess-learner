export const meta = {
  name: 'wave5-content-universe',
  description: 'Every content type from DESIGN.md §9 + SUBJECTS.md, built on the scene-spec substrate in the law-mandated order (Math+CS → Physics+Chem → fact base → Bio+Social)',
  phases: [{ title: 'Substrate' }, { title: 'Math+CS' }, { title: 'Physics+Chem' }, { title: 'Factbase+Bio+Social' }, { title: 'Prove' }],
}
const PRE = `Read /Users/depl/Documents/classess-learner/SUBJECTS.md + WOBO.md + DESIGN.md §9 + the fleet brief (second-cut design law) FIRST. Doctrine: the model authors VALIDATED SCENE SPECS, never pixels; every renderer implements the scene contract (publish state, register targets, applyTutorAction); every subject ships WITH its validator or not at all; concepts not board paths; async generation, never the spinner. MISSION:\n`
const R = { type: 'object', properties: { built: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, typecheck: { type: 'string' }, unfinished: { type: 'string' } }, required: ['built', 'files', 'typecheck', 'unfinished'] }

phase('Substrate')
const substrate = await parallel([
  () => agent(PRE + `Own the spec contract: services/gateway plexus scene-spec Pydantic models → JSON Schema bundle → generated TS types in apps/web-pwa/src/engines/spec-types.ts (codegen script, committed output). Cover the content-type registry: guided-discovery card, sim, what-if, perturbation ("break it": failure parameter exposed as slider + breakpoint annotation), free-play sandbox, mini-workbook (match-following, fill-blank, order-steps, MCQ), flashcards (FSRS-wired), visual-compare, concept-map, chart, diagram, word-problem breakdown, derivation depth, mini-game spec, video (motion-scene), podcast (audio-scene). One discriminated union; validators declared per type.`, { label: 'spec-contract', phase: 'Substrate', schema: R }),
  () => agent(PRE + `Own apps/web-pwa/src/engines/renderers/ — the universal renderer registry: a ContentRenderer that takes any spec-union value and mounts the right surface; implement now with existing runners (SimRunner, DiagramView, MotionPlayer) + NEW: MiniWorkbook (match/fill/order/MCQ, tactile drag, per-item XP), Flashcards (flip physics, FSRS reviewCard), VisualCompare (side-by-side animated correspondences), ConceptMap (force layout from real prereq graph), PerturbationSandbox (slider to the breaking point, honest annotation). Second-cut design law + cascade entrances throughout.`, { label: 'renderer-registry', phase: 'Substrate', schema: R }),
])

phase('Math+CS')
const mathcs = await parallel([
  () => agent(PRE + `Math renderers: add mafs + jsxgraph deps; GeometryScene (draggable Euclidean), GraphScene (function plots, tutor-walkable), NumberLine, AreaProof (the 2ab rectangles live here), ProbabilitySpinner. CAS-validated via the existing verifier seam. Wire into the renderer registry + one showcase topic (m3 quadrilaterals) end to end.`, { label: 'math-renderers', phase: 'Math+CS', schema: R }),
  () => agent(PRE + `CS ramp: BlockAssembly (snap blocks → robot walks tiles), ParsonsProblem (drag lines into order + distractor), ExecutionVisualizer (the crown jewel: pyodide-run python, current line glowing, variables as animating boxes, call stack, step/scrub; recursion tree). Add pyodide + codemirror deps. Validate by running the code. Register 'Computer science' as a subject in the catalog with a starter chapter so it is playable.`, { label: 'cs-renderers', phase: 'Math+CS', schema: R }),
])

phase('Physics+Chem')
const physchem = await parallel([
  () => agent(PRE + `Physics: ProjectileSim (canvas, exact kinematics, live sliders), CircuitSandbox (wire bulbs/cells/resistors freely — the free-play flagship), WaveScene, FreeBodyDiagram. Dimensional-analysis validator in the gateway. Perturbation presets (V=IR → r internal).`, { label: 'physics', phase: 'Physics+Chem', schema: R }),
  () => agent(PRE + `Chemistry: EquationBalancer (conservation checker), TitrationLab (the drops → transparent→pink→deep pink), MoleculeViewer (3dmol.js), Stoichiometry what-if. Balance/stoichiometry validators server-side.`, { label: 'chemistry', phase: 'Physics+Chem', schema: R }),
])

phase('Factbase+Bio+Social')
const biosocial = await parallel([
  () => agent(PRE + `THE FACT BASE (owned build item): content/factbase/ NCERT-aligned assertions keyed to concepts (subject/chapter/topic → facts with source refs), gateway validator endpoint (claim → supported/unsupported/unknown), used as the gate for descriptive content. Seed classes 8+10 science + social from the catalogs.`, { label: 'fact-base', phase: 'Factbase+Bio+Social', schema: R, model: 'sonnet' }),
  () => agent(PRE + `Biology: DragLabelDiagram (cell/heart/plant SVG), SequenceProcess (mitosis/digestion ordering), PunnettSquare (computational validation), FoodWeb builder. Fact-base-gated descriptions.`, { label: 'biology', phase: 'Factbase+Bio+Social', schema: R }),
  () => agent(PRE + `Social science: TimelineScene (event ordering), MapScene (maplibre + d3-geo, labeled regions), SupplyDemand curves (computational), CivicsStructure (labeled org diagrams). Fact-base-gated facts.`, { label: 'social', phase: 'Factbase+Bio+Social', schema: R }),
])

phase('Prove')
const prove = await agent(PRE + `All files yours: full monorepo gates green (typecheck/biome/tests/pytest/build), extend e2e to open one renderer of every content type, and a coverage report: every DESIGN.md §9 content type → its renderer + validator + a playable example, or an honest gap list.`, { label: 'prove5', phase: 'Prove', schema: R, effort: 'high' })
return { substrate, mathcs, physchem, biosocial, prove }
