'use client';

/**
 * EnginesGallery — a dev preview of the "physics of understanding" renderers (type-batch A). Reach
 * it at `#engines`. Each engine renders with its hand-authored demo spec so the surfaces can be QA'd
 * and screenshotted outside a generated course. Not part of the learner flow — a workshop bench.
 */

import { ARCADE_DEMO, ArcadeShell } from '../../engines/ArcadeShell';
import {
  CHEM_BALANCE_DEMO,
  CHEM_STRUCTURE_DEMO,
  CHEM_TITRATION_DEMO,
  ChemScene,
} from '../../engines/ChemScene';
import { COMPARE_DEMO, CompareInteractive } from '../../engines/CompareInteractive';
import { CONCEPTMAP_DEMO, ConceptMap } from '../../engines/ConceptMap';
import { CsRampDemos } from '../../engines/cs/gallery';
import { DERIVATION_DEMO, DerivationCard } from '../../engines/DerivationDepth';
import { DISCOVERY_DEMO, Discovery } from '../../engines/Discovery';
import { FLASHCARDS_DEMO, Flashcards } from '../../engines/Flashcards';
import { MATHSCENE_DEMOS, MathScene } from '../../engines/MathScene';
import { MiniWorkbook, WORKBOOK_DEMO } from '../../engines/MiniWorkbook';
import { PERTURB_DEMO, PerturbationSandbox } from '../../engines/PerturbationSandbox';
import {
  PHYSICS_FREEBODY_DEMO,
  PHYSICS_PROJECTILE_DEMO,
  PHYSICS_WAVE_DEMO,
  PhysicsScene,
} from '../../engines/PhysicsScene';
import { PODCAST_DEMO, PodcastPlayer } from '../../engines/PodcastPlayer';
import { WHATIF_DEMO, WhatIfNumerical } from '../../engines/WhatIfNumerical';
import { WORDPROBLEM_DEMO, WordProblemBreakdown } from '../../engines/WordProblemBreakdown';
import { hueForTopic } from '../../ui/hues';
import { whisper } from '../course/shared';

const noop = () => {};
// a fixed, valid UUID so the demo engines' evidence events (zUuid node_id) validate on the bench
const DEMO_NODE = '00000000-0000-7000-8000-00000000b15b';

function Bench({ id, name, children }: { id: string; name: string; children: React.ReactNode }) {
  return (
    <section
      id={id}
      style={{
        borderTop: '0.5px solid var(--clss-hairline-on-paper)',
        padding: '18px 0 42px',
      }}
    >
      <div style={{ ...whisper, padding: '0 24px', marginBottom: 4 }}>{name}</div>
      {children}
    </section>
  );
}

export function EnginesGallery() {
  const hue = hueForTopic('phys-electricity');
  return (
    <div
      style={{
        width: '100%',
        height: '100dvh',
        overflowY: 'auto',
        background: 'var(--clss-paper)',
        color: 'var(--clss-ink-900)',
      }}
    >
      <div style={{ padding: '28px 24px 8px', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ ...whisper }}>type-batch a · the physics of understanding</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 550, marginTop: 8 }}>engine gallery</h1>
      </div>
      <Bench id="engine-discovery" name="guided discovery — the keystone shell, act-to-reveal">
        <Discovery spec={DISCOVERY_DEMO} hue={hue} setBar={noop} onDone={noop} />
      </Bench>
      <Bench id="engine-perturb" name="perturbation sandbox — break it">
        <PerturbationSandbox spec={PERTURB_DEMO} hue={hue} setBar={noop} onDone={noop} />
      </Bench>
      <Bench id="engine-whatif" name="what-if numerical — every value editable">
        <WhatIfNumerical spec={WHATIF_DEMO} hue={hueForTopic('math')} setBar={noop} onDone={noop} />
      </Bench>
      <Bench id="engine-compare" name="compare interactive — dual panel">
        <CompareInteractive
          spec={COMPARE_DEMO}
          hue={hueForTopic('bio')}
          setBar={noop}
          onDone={noop}
        />
      </Bench>
      <Bench id="engine-conceptmap" name="concept map — seeded, tappable">
        <ConceptMap spec={CONCEPTMAP_DEMO} hue={hueForTopic('chem')} setBar={noop} onDone={noop} />
      </Bench>

      <div style={{ padding: '32px 24px 8px', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ ...whisper }}>
          math engines · Mafs scenes — draggable, live-bound, Vidya-drivable
        </div>
      </div>
      {MATHSCENE_DEMOS.map((spec) => (
        <Bench
          key={spec.id}
          id={`engine-mathscene-${spec.kind}`}
          name={`math scene · ${spec.kind} — ${spec.title}`}
        >
          <MathScene spec={spec} hue={hueForTopic('math')} setBar={noop} onDone={noop} />
        </Bench>
      ))}

      <div style={{ padding: '32px 24px 8px', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ ...whisper }}>physics engines · exact closed forms, dimension-checked</div>
      </div>
      <Bench id="engine-physics-projectile" name="physics — projectile, live angle + velocity">
        <PhysicsScene
          spec={PHYSICS_PROJECTILE_DEMO}
          hue={hueForTopic('phys-mechanics')}
          setBar={noop}
          onDone={noop}
        />
      </Bench>
      <Bench id="engine-physics-freebody" name="physics — free-body diagram, draggable forces">
        <PhysicsScene
          spec={PHYSICS_FREEBODY_DEMO}
          hue={hueForTopic('phys-mechanics')}
          setBar={noop}
          onDone={noop}
        />
      </Bench>
      <Bench id="engine-physics-wave" name="physics — wave superposition">
        <PhysicsScene
          spec={PHYSICS_WAVE_DEMO}
          hue={hueForTopic('phys-mechanics')}
          setBar={noop}
          onDone={noop}
        />
      </Bench>

      <div style={{ padding: '32px 24px 8px', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ ...whisper }}>chemistry engines · conservation is law, RDKit + 3Dmol</div>
      </div>
      <Bench id="engine-chem-balance" name="chem — equation balancer, live element conservation">
        <ChemScene spec={CHEM_BALANCE_DEMO} hue={hueForTopic('chem')} setBar={noop} onDone={noop} />
      </Bench>
      <Bench id="engine-chem-titration" name="chem — titration lab, drop-by-drop pH curve">
        <ChemScene
          spec={CHEM_TITRATION_DEMO}
          hue={hueForTopic('chem')}
          setBar={noop}
          onDone={noop}
        />
      </Bench>
      <Bench id="engine-chem-structure" name="chem — 2D structure from SMILES, RDKit-js">
        <ChemScene
          spec={CHEM_STRUCTURE_DEMO}
          hue={hueForTopic('chem')}
          setBar={noop}
          onDone={noop}
        />
      </Bench>

      <div style={{ padding: '32px 24px 8px', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ ...whisper }}>cs ramp · blocks → parsons → real python, Pyodide-run</div>
      </div>
      <CsRampDemos />

      <div style={{ padding: '32px 24px 8px', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ ...whisper }}>type-batch b · practice & delight</div>
      </div>
      <Bench id="engine-workbook" name="mini-workbook — match, fill, order, checked into evidence">
        <MiniWorkbook
          spec={WORKBOOK_DEMO}
          hue={hueForTopic('chem')}
          nodeId={DEMO_NODE}
          setBar={noop}
          onDone={noop}
        />
      </Bench>
      <Bench id="engine-flashcards" name="flashcards — spring 3d flip, FSRS on grade">
        <Flashcards
          spec={FLASHCARDS_DEMO}
          hue={hueForTopic('chem')}
          nodeId={DEMO_NODE}
          setBar={noop}
          onDone={noop}
        />
      </Bench>
      <Bench id="engine-derivation" name="derivation depth — the ⓘ, nestable one level">
        <DerivationCard
          spec={DERIVATION_DEMO}
          hue={hueForTopic('math')}
          setBar={noop}
          onDone={noop}
        />
      </Bench>
      <Bench id="engine-wordproblem" name="word-problem breakdown — given · find · plan · solve">
        <WordProblemBreakdown
          spec={WORDPROBLEM_DEMO}
          hue={hueForTopic('math')}
          setBar={noop}
          onDone={noop}
        />
      </Bench>
      <Bench id="engine-podcast" name="podcast player — chaptered, TTS seam, speed + minimize">
        <PodcastPlayer
          spec={PODCAST_DEMO}
          hue={hueForTopic('phys-electricity')}
          setBar={noop}
          onDone={noop}
        />
      </Bench>
      <Bench id="engine-arcade" name="arcade — falling-answers catch, wired to real items">
        <ArcadeShell
          spec={ARCADE_DEMO}
          hue={hueForTopic('chem')}
          nodeId={DEMO_NODE}
          setBar={noop}
          onDone={noop}
        />
      </Bench>
    </div>
  );
}
