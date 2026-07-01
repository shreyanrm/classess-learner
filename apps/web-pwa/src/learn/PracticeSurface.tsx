import { hairline, ink, radius, space, typeScale } from '@classess/config';
import { type PracticeItem, type RetrievalCard, reviewCard, type Sdk } from '@classess/sdk';
import { useEffect, useRef, useState } from 'react';

const normalize = (s: string) => s.replace(/\s+/g, '').replace(/^x=/i, '');

function BackButton({ onExit, label }: { onExit: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onExit}
      style={{
        alignSelf: 'flex-start',
        border: 0,
        background: 'transparent',
        color: ink[500],
        cursor: 'pointer',
        fontSize: typeScale.caption.size,
      }}
    >
      {label}
    </button>
  );
}

const shell = {
  flex: 1,
  width: '100%',
  maxWidth: 720,
  margin: '0 auto',
  padding: space[3],
  display: 'flex',
  flexDirection: 'column',
  gap: space[3],
} as const;

export interface PracticeSurfaceProps {
  sdk: Sdk;
  nodeId: string;
  onEvidence: () => void;
  onExit: () => void;
}

/**
 * PracticeSurface — unaided evidence. Vidya deliberately steps back; the learner's own answers are the
 * evidence. Each answer is graded against the verifier-frozen correct value, then the full event chain
 * fires (served -> answered -> evidence -> retrieval scheduled by FSRS), which flows through the SDK to
 * the learner's mastery band. Repeated unaided-correct work carries them to independent, and the concept
 * ignites back on the home surface.
 */
export function PracticeSurface({ sdk, nodeId, onEvidence, onExit }: PracticeSurfaceProps) {
  const [items, setItems] = useState<PracticeItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');
  const cards = useRef<Map<string, RetrievalCard>>(new Map());
  const servedRef = useRef<string | null>(null);

  useEffect(() => {
    sdk.content.getPracticeItems(nodeId).then(setItems);
  }, [sdk, nodeId]);

  const item = items[index];

  useEffect(() => {
    if (!item || servedRef.current === item.id) return;
    servedRef.current = item.id;
    sdk.events.record(
      'practice.item.served.v1',
      {
        node_id: nodeId,
        item_id: item.id,
        difficulty: item.difficulty,
        scheduled_by: 'fsrs',
        aided: false,
      },
      { ontologyNodeId: nodeId },
    );
  }, [item, sdk, nodeId]);

  if (items.length > 0 && !item) {
    return (
      <main style={shell}>
        <BackButton onExit={onExit} label="Done" />
        <div
          style={{
            padding: space[2],
            border: `1px solid ${hairline.onPaper}`,
            borderRadius: radius.md,
          }}
        >
          <p style={{ margin: 0, fontSize: typeScale.body.size, color: ink[900] }}>
            You worked through the set on your own. That is the evidence that counts.
          </p>
        </div>
      </main>
    );
  }

  const submit = () => {
    if (!item) return;
    const learner = Number(normalize(answer));
    const correct = Number.isFinite(learner) && learner === Number(normalize(item.answer));
    const card = reviewCard(cards.current.get(item.id) ?? null, correct, Date.now());
    cards.current.set(item.id, card);

    sdk.events.record(
      'practice.item.answered.v1',
      {
        node_id: nodeId,
        item_id: item.id,
        response: { kind: 'numeric', value: Number.isFinite(learner) ? learner : 0 },
        correct,
        latency_ms: 0,
        independence_signal: 0.95,
      },
      { ontologyNodeId: nodeId },
    );
    sdk.events.record(
      'evidence.recorded.v1',
      {
        evidence_id: crypto.randomUUID(),
        node_id: nodeId,
        source: 'practice',
        correct,
        independence: correct ? 0.95 : 0.4,
        gap_types: correct ? [] : ['procedural'],
      },
      { ontologyNodeId: nodeId },
    );
    sdk.events.record(
      'practice.retrieval.scheduled.v1',
      {
        node_id: nodeId,
        item_id: item.id,
        due_at: card.dueAt,
        stability: card.stabilityDays,
        difficulty: card.difficulty,
        scheduler: 'fsrs',
      },
      { ontologyNodeId: nodeId },
    );

    setFeedback(correct ? 'correct' : 'wrong');
    onEvidence();
    if (correct) {
      window.setTimeout(() => {
        setAnswer('');
        setFeedback('none');
        setIndex((i) => i + 1);
      }, 700);
    }
  };

  return (
    <main style={shell}>
      <BackButton onExit={onExit} label="Back" />
      <span style={{ fontSize: typeScale.caption.size, color: ink[500] }}>
        Practice · your own work
      </span>
      <div
        style={{
          padding: space[3],
          border: `1px solid ${hairline.onPaper}`,
          borderRadius: radius.md,
        }}
      >
        <span style={{ fontSize: typeScale.caption.size, color: ink[500] }}>
          {item ? `Question ${index + 1} of ${items.length}` : 'Loading'}
        </span>
        <p
          style={{
            margin: `${space[1]}px 0 ${space[2]}px`,
            fontSize: typeScale.h3.size,
            fontWeight: 500,
            color: ink[900],
          }}
        >
          {item?.equation}
        </p>
        <div style={{ display: 'flex', gap: space[1], alignItems: 'center' }}>
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="x = ?"
            aria-label="your answer"
            style={{
              flex: 1,
              border: `1px solid ${hairline.onPaper}`,
              borderRadius: radius.sm,
              padding: `${space[1]}px ${space[1]}px`,
              fontSize: typeScale.bodyLg.size,
              background: '#FFFFFF',
              color: ink[900],
            }}
          />
          <button
            type="button"
            onClick={submit}
            style={{
              border: 0,
              borderRadius: radius.sm,
              padding: `${space[1]}px ${space[2]}px`,
              background: ink[900],
              color: '#FFFFFF',
              cursor: 'pointer',
              fontSize: typeScale.body.size,
            }}
          >
            Check
          </button>
        </div>
        {feedback === 'correct' && (
          <p
            style={{ margin: `${space[1]}px 0 0`, fontSize: typeScale.body.size, color: ink[900] }}
          >
            Correct.
          </p>
        )}
        {feedback === 'wrong' && (
          <p
            style={{ margin: `${space[1]}px 0 0`, fontSize: typeScale.body.size, color: ink[700] }}
          >
            Not yet. Look at it again and try once more.
          </p>
        )}
      </div>
      <p style={{ margin: 0, fontSize: typeScale.caption.size, color: ink[500] }}>
        Vidya waits quietly here. This part is yours.
      </p>
    </main>
  );
}
