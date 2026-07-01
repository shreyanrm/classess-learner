import { hairline, ink, radius, space, typeScale } from '@classess/config';
import { useRegisterTarget } from '@classess/vidya';

export interface Step {
  id: string;
  value: string;
}

/** The original problem — a target Vidya can point back to. */
function EquationLine({ equation }: { equation: string }) {
  const ref = useRegisterTarget<HTMLDivElement>('equation', { kind: 'equation', label: equation });
  return (
    <div
      ref={ref}
      style={{
        padding: `${space[1]}px ${space[1]}px`,
        fontSize: typeScale.bodyLg.size,
        fontWeight: 500,
        color: ink[900],
      }}
    >
      {equation}
    </div>
  );
}

/** One line of the learner's working. Registered as `step-{index}` so Vidya can draw on it. */
function StepLine({
  index,
  value,
  onChange,
  onRemove,
}: {
  index: number;
  value: string;
  onChange: (value: string) => void;
  onRemove?: () => void;
}) {
  const ref = useRegisterTarget<HTMLDivElement>(`step-${index}`, {
    kind: 'step',
    label: value || `working line ${index + 1}`,
  });
  return (
    <div ref={ref} style={{ display: 'flex', alignItems: 'center', gap: space[1] }}>
      <span style={{ width: 18, color: ink[300], fontSize: typeScale.caption.size }}>
        {index + 1}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="write the next line, e.g. 2x = 4"
        aria-label={`working line ${index + 1}`}
        style={{
          flex: 1,
          border: 0,
          borderBottom: `1px solid ${hairline.onPaper}`,
          padding: `${space[1]}px 0`,
          fontSize: typeScale.bodyLg.size,
          background: 'transparent',
          color: ink[900],
          outline: 'none',
        }}
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`remove line ${index + 1}`}
          style={{ border: 0, background: 'transparent', color: ink[300], cursor: 'pointer' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M2 2l10 10M12 2L2 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export interface CanvasSurfaceProps {
  equation: string;
  steps: Step[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

/**
 * CanvasSurface — the shared working area Vidya perceives. The learner writes their working line by
 * line; each line publishes to the context bus and registers as a target, so when Vidya reasons she
 * can point at the learner's ACTUAL step. This is the page becoming her canvas, made concrete.
 */
export function CanvasSurface({ equation, steps, onChange, onAdd, onRemove }: CanvasSurfaceProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: space[1],
        padding: space[2],
        border: `1px solid ${hairline.onPaper}`,
        borderRadius: radius.md,
        background: '#FAFAFA',
      }}
    >
      <span style={{ fontSize: typeScale.caption.size, color: ink[500] }}>Your working</span>
      <EquationLine equation={equation} />
      {steps.map((step, index) => (
        <StepLine
          key={step.id}
          index={index}
          value={step.value}
          onChange={(v) => onChange(index, v)}
          onRemove={steps.length > 1 ? () => onRemove(index) : undefined}
        />
      ))}
      <button
        type="button"
        onClick={onAdd}
        style={{
          alignSelf: 'flex-start',
          marginTop: space[1],
          border: 0,
          background: 'transparent',
          color: ink[700],
          cursor: 'pointer',
          fontSize: typeScale.caption.size,
        }}
      >
        Add a line
      </button>
    </div>
  );
}
