import { type ReactNode, useId } from 'react';

export interface ToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
  /** The accessible name, when the switch is not inside a <ToggleRow>. */
  label?: string;
  labelledBy?: string;
  className?: string;
}

/**
 * The switch: paper-3 off, Wobo blue on, a white knob that slides. The button is the thumb's
 * target (44px on a phone); the switch itself is drawn at the prototype's 46×28 inside it.
 */
export function Toggle({ on, onChange, label, labelledBy, className }: ToggleProps) {
  const cls = ['wk-sw', on && 'wk-on'].filter(Boolean).join(' ');
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      aria-labelledby={labelledBy}
      className={className ? `wk-sw-hit ${className}` : 'wk-sw-hit'}
      onClick={() => onChange(!on)}
    >
      <span className={cls} aria-hidden="true" />
    </button>
  );
}

export interface ToggleRowProps {
  /** What the setting is. */
  title: ReactNode;
  /** What it is set to, or what it does. */
  hint?: ReactNode;
  /** The control on the right: a <Toggle>, a <Segmented>, a small quiet <Button>. */
  children?: ReactNode;
  /** With `on` and `onChange` the row draws its own switch, named by the title. */
  on?: boolean;
  onChange?: (on: boolean) => void;
}

/** A settings row: the title and its hint on the left, the control on the right, a 2px rule above. */
export function ToggleRow({ title, hint, children, on, onChange }: ToggleRowProps) {
  const id = useId();
  return (
    <div className="wk-toggle">
      <div>
        <b id={id}>{title}</b>
        {hint !== undefined && <span>{hint}</span>}
      </div>
      {onChange ? <Toggle on={!!on} onChange={onChange} labelledBy={id} /> : children}
    </div>
  );
}
