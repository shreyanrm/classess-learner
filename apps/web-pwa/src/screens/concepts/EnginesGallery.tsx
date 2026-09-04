'use client';

/**
 * The engine gallery — a concept, on the lesson plane (board 03 of design/prototypes/app-v1.html).
 *
 * It used to be a scroll of every "physics of understanding" renderer stacked on a bare page. It is
 * now what every other surface is: the plane card with Wobo's bar, the canvas and the say row, and
 * the side column beside it listing the concept's steps — one step per engine, grouped the way the
 * batches are, the one on the canvas lit. One board at a time, the way a lesson shows one card at a
 * time, so an engine is QA'd on the plane it will actually be taught on.
 *
 * Each engine still renders with its own hand-authored demo spec. Not part of the learner flow — a
 * workshop bench, reached at /concept/engines.
 */

import { type ReactNode, useMemo, useState } from 'react';
import { ANATOMY_DEMOS, AnatomyScene } from '../../engines/AnatomyScene';
import { ARCADE_DEMO, ArcadeShell } from '../../engines/ArcadeShell';
import { BIO_DEMOS, BioScene } from '../../engines/BioScene';
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
import { MAP_DEMOS, MapScene } from '../../engines/MapScene';
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
import { SOCIAL_DEMOS, SocialScene } from '../../engines/SocialScene';
import { WHATIF_DEMO, WhatIfNumerical } from '../../engines/WhatIfNumerical';
import { WORDPROBLEM_DEMO, WordProblemBreakdown } from '../../engines/WordProblemBreakdown';
import { AppFrame } from '../../shell/AppFrame';
import { hueForTopic } from '../../ui/hues';
import { Button, Card, Tag, TopBar, WoboHead } from '../../ui/primitives';
import '../course/lesson.css';
import './concept.css';

const noop = () => {};
// a fixed, valid UUID so the demo engines' evidence events (zUuid node_id) validate on the bench
const DEMO_NODE = '00000000-0000-7000-8000-00000000b15b';

/** What the crumb and the spoken heading call this concept. */
const TITLE = 'engine gallery';

interface Step {
  id: string;
  /** The engine's own line, as the benches always named them. */
  name: string;
  board: () => ReactNode;
}

interface Batch {
  /** The card's eyebrow in the side column. */
  tag: string;
  steps: Step[];
}

/** Every engine on the bench, in the batches they ship in. Built once — the specs are constants. */
function buildBatches(): Batch[] {
  const hue = hueForTopic('phys-electricity');
  const math = hueForTopic('math');
  const bio = hueForTopic('bio');
  const chem = hueForTopic('chem');
  const social = hueForTopic('social');
  const mech = hueForTopic('phys-mechanics');
  return [
    {
      tag: 'type-batch a',
      steps: [
        {
          id: 'engine-discovery',
          name: 'guided discovery — the keystone shell, act-to-reveal',
          board: () => <Discovery spec={DISCOVERY_DEMO} hue={hue} setBar={noop} onDone={noop} />,
        },
        {
          id: 'engine-perturb',
          name: 'perturbation sandbox — break it',
          board: () => (
            <PerturbationSandbox spec={PERTURB_DEMO} hue={hue} setBar={noop} onDone={noop} />
          ),
        },
        {
          id: 'engine-whatif',
          name: 'what-if numerical — every value editable',
          board: () => (
            <WhatIfNumerical spec={WHATIF_DEMO} hue={math} setBar={noop} onDone={noop} />
          ),
        },
        {
          id: 'engine-compare',
          name: 'compare interactive — dual panel',
          board: () => (
            <CompareInteractive spec={COMPARE_DEMO} hue={bio} setBar={noop} onDone={noop} />
          ),
        },
        {
          id: 'engine-conceptmap',
          name: 'concept map — seeded, tappable',
          board: () => <ConceptMap spec={CONCEPTMAP_DEMO} hue={chem} setBar={noop} onDone={noop} />,
        },
      ],
    },
    {
      tag: 'math engines',
      steps: MATHSCENE_DEMOS.map((spec) => ({
        id: `engine-mathscene-${spec.kind}`,
        name: `math scene · ${spec.kind} — ${spec.title}`,
        board: () => <MathScene spec={spec} hue={math} setBar={noop} onDone={noop} />,
      })),
    },
    {
      tag: 'physics engines',
      steps: [
        {
          id: 'engine-physics-projectile',
          name: 'physics — projectile, live angle + velocity',
          board: () => (
            <PhysicsScene spec={PHYSICS_PROJECTILE_DEMO} hue={mech} setBar={noop} onDone={noop} />
          ),
        },
        {
          id: 'engine-physics-freebody',
          name: 'physics — free-body diagram, draggable forces',
          board: () => (
            <PhysicsScene spec={PHYSICS_FREEBODY_DEMO} hue={mech} setBar={noop} onDone={noop} />
          ),
        },
        {
          id: 'engine-physics-wave',
          name: 'physics — wave superposition',
          board: () => (
            <PhysicsScene spec={PHYSICS_WAVE_DEMO} hue={mech} setBar={noop} onDone={noop} />
          ),
        },
      ],
    },
    {
      tag: 'chemistry engines',
      steps: [
        {
          id: 'engine-chem-balance',
          name: 'chem — equation balancer, live element conservation',
          board: () => (
            <ChemScene spec={CHEM_BALANCE_DEMO} hue={chem} setBar={noop} onDone={noop} />
          ),
        },
        {
          id: 'engine-chem-titration',
          name: 'chem — titration lab, drop-by-drop pH curve',
          board: () => (
            <ChemScene spec={CHEM_TITRATION_DEMO} hue={chem} setBar={noop} onDone={noop} />
          ),
        },
        {
          id: 'engine-chem-structure',
          name: 'chem — 2D structure from SMILES, RDKit-js',
          board: () => (
            <ChemScene spec={CHEM_STRUCTURE_DEMO} hue={chem} setBar={noop} onDone={noop} />
          ),
        },
      ],
    },
    {
      tag: 'biology engines',
      steps: [
        ...BIO_DEMOS.map((spec) => ({
          id: `engine-bio-${spec.kind}`,
          name: `biology · ${spec.kind} — ${spec.title}`,
          board: () => <BioScene spec={spec} hue={bio} setBar={noop} onDone={noop} />,
        })),
        ...ANATOMY_DEMOS.map((spec) => ({
          id: `engine-anatomy-${spec.id}`,
          name: `anatomy 3d — ${spec.title}, rotatable + tappable labelled parts`,
          board: () => <AnatomyScene spec={spec} hue={bio} setBar={noop} onDone={noop} />,
        })),
      ],
    },
    {
      tag: 'social engines',
      steps: [
        ...SOCIAL_DEMOS.map((spec) => ({
          id: `engine-social-${spec.kind}`,
          name: `social · ${spec.kind} — ${spec.title}`,
          board: () => <SocialScene spec={spec} hue={social} setBar={noop} onDone={noop} />,
        })),
        ...MAP_DEMOS.map((spec) => ({
          id: `engine-map-${spec.interaction.mode}`,
          name: `map · ${spec.interaction.mode} — ${spec.title}`,
          board: () => <MapScene spec={spec} hue={social} setBar={noop} onDone={noop} />,
        })),
      ],
    },
    {
      tag: 'cs ramp',
      steps: [
        {
          id: 'engine-cs-ramp',
          name: 'cs ramp — blocks → parsons → real python, Pyodide-run',
          board: () => <CsRampDemos />,
        },
      ],
    },
    {
      tag: 'type-batch b',
      steps: [
        {
          id: 'engine-workbook',
          name: 'mini-workbook — match, fill, order, checked into evidence',
          board: () => (
            <MiniWorkbook
              spec={WORKBOOK_DEMO}
              hue={chem}
              nodeId={DEMO_NODE}
              setBar={noop}
              onDone={noop}
            />
          ),
        },
        {
          id: 'engine-flashcards',
          name: 'flashcards — spring 3d flip, FSRS on grade',
          board: () => (
            <Flashcards
              spec={FLASHCARDS_DEMO}
              hue={chem}
              nodeId={DEMO_NODE}
              setBar={noop}
              onDone={noop}
            />
          ),
        },
        {
          id: 'engine-derivation',
          name: 'derivation depth — the ⓘ, nestable one level',
          board: () => (
            <DerivationCard spec={DERIVATION_DEMO} hue={math} setBar={noop} onDone={noop} />
          ),
        },
        {
          id: 'engine-wordproblem',
          name: 'word-problem breakdown — given · find · plan · solve',
          board: () => (
            <WordProblemBreakdown spec={WORDPROBLEM_DEMO} hue={math} setBar={noop} onDone={noop} />
          ),
        },
        {
          id: 'engine-podcast',
          name: 'podcast player — chaptered, TTS seam, speed + minimize',
          board: () => <PodcastPlayer spec={PODCAST_DEMO} hue={hue} setBar={noop} onDone={noop} />,
        },
        {
          id: 'engine-arcade',
          name: 'arcade — falling-answers catch, wired to real items',
          board: () => (
            <ArcadeShell
              spec={ARCADE_DEMO}
              hue={chem}
              nodeId={DEMO_NODE}
              setBar={noop}
              onDone={noop}
            />
          ),
        },
      ],
    },
  ];
}

export function EnginesGallery() {
  const batches = useMemo(buildBatches, []);
  const steps = useMemo(() => batches.flatMap((b) => b.steps), [batches]);
  const [at, setAt] = useState(0);
  const step = steps[at] ?? steps[0];
  if (!step) return null;

  return (
    <AppFrame active="learn">
      <h1 className="ls-sr">{TITLE}</h1>
      <TopBar crumb={`Concept · ${TITLE} · ${at + 1} of ${steps.length}`} />
      <div className="ls-lesson cn-lesson">
        <section className="ls-plane cn-plane" aria-label={`${TITLE}, on the plane`}>
          <div className="ls-bar">
            <b>Wobo</b> · the physics of understanding
          </div>
          <div className="ls-canvas">
            <div className="ls-stage wobo-scroll-quiet">
              <div className="cn-board" key={step.id}>
                {step.board()}
              </div>
            </div>
          </div>
          <div className="ls-say">
            <WoboHead size={44} />
            <div className="hand">{step.name}</div>
            <div className="ls-actions">
              <Button
                size="sm"
                tone="quiet"
                disabled={at === 0}
                onClick={() => setAt((i) => Math.max(0, i - 1))}
              >
                Back
              </Button>
              <Button
                size="sm"
                disabled={at >= steps.length - 1}
                onClick={() => setAt((i) => Math.min(steps.length - 1, i + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </section>
        <aside className="ls-side cn-side">
          {batches.map((batch) => (
            <Card key={batch.tag} compact>
              <Tag>{batch.tag}</Tag>
              <div className="cn-steps">
                {batch.steps.map((s) => {
                  const index = steps.indexOf(s);
                  const on = index === at;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={on ? 'cn-step cn-on' : 'cn-step'}
                      aria-current={on ? 'step' : undefined}
                      onClick={() => setAt(index)}
                    >
                      <i>{index + 1}</i>
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
        </aside>
      </div>
    </AppFrame>
  );
}
