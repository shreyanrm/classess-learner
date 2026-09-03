export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}

/** A pill of paper-3 holding a few options; the chosen one lifts to paper. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedProps<T>) {
  return (
    <div className={className ? `wk-seg ${className}` : 'wk-seg'}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={o.id === value ? 'wk-on' : undefined}
          aria-pressed={o.id === value}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
