import { hairline, ink, radius, space, typeScale } from '@classess/config';
import { useVidyaBus } from '@classess/vidya';
import { useEffect, useRef, useState } from 'react';
import { CanvasSurface, type Step } from './CanvasSurface';

export interface LearnSurfaceProps {
  equation: string;
  prompt: string;
  nodeId: string;
  nodeName: string;
  onAsk: (text: string) => void;
  onExit: () => void;
}

/**
 * LearnSurface — the atom's learn loop: an active pose (the opener), a working canvas Vidya perceives,
 * and a way to ask her. The learner writes each line; the canvas publishes to the bus so when they ask
 * Vidya, she reasons over their actual working and points at the exact line that needs attention.
 * Never explain-first: the pose comes before any reveal.
 */
export function LearnSurface({
  equation,
  prompt,
  nodeId,
  nodeName,
  onAsk,
  onExit,
}: LearnSurfaceProps) {
  const bus = useVidyaBus();
  const idRef = useRef(1);
  const [steps, setSteps] = useState<Step[]>([{ id: 's0', value: '' }]);

  useEffect(() => {
    bus.publishPage({ route: 'learn', state: { nodeId } });
    bus.publishCurriculum({ nodeId, nodeName });
  }, [bus, nodeId, nodeName]);

  useEffect(() => {
    bus.publishCanvas({ nodeId, equation, steps: steps.map((s) => s.value).filter(Boolean) });
    return () => bus.publishCanvas(undefined);
  }, [bus, nodeId, equation, steps]);

  const setValue = (index: number, value: string) =>
    setSteps((s) => s.map((st, i) => (i === index ? { ...st, value } : st)));
  const add = () => setSteps((s) => [...s, { id: `s${idRef.current++}`, value: '' }]);
  const remove = (index: number) => setSteps((s) => s.filter((_, i) => i !== index));

  return (
    <main
      style={{
        flex: 1,
        width: '100%',
        maxWidth: 720,
        margin: '0 auto',
        padding: space[3],
        display: 'flex',
        flexDirection: 'column',
        gap: space[3],
      }}
    >
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
        Back
      </button>

      <div
        style={{
          padding: space[2],
          border: `1px solid ${hairline.onPaper}`,
          borderRadius: radius.md,
        }}
      >
        <span style={{ fontSize: typeScale.caption.size, color: ink[500] }}>{nodeName}</span>
        <p style={{ margin: `${space[1]}px 0 0`, fontSize: typeScale.body.size, color: ink[900] }}>
          {prompt}
        </p>
      </div>

      <CanvasSurface
        equation={equation}
        steps={steps}
        onChange={setValue}
        onAdd={add}
        onRemove={remove}
      />

      <button
        type="button"
        onClick={() => onAsk('Can you check my working so far?')}
        style={{
          alignSelf: 'flex-start',
          border: 0,
          borderRadius: radius.sm,
          padding: `${space[1]}px ${space[2]}px`,
          background: ink[900],
          color: '#FFFFFF',
          cursor: 'pointer',
          fontSize: typeScale.body.size,
        }}
      >
        Check with Vidya
      </button>
    </main>
  );
}
