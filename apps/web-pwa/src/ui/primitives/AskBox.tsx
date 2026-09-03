import { type FormEvent, useState } from 'react';
import { Button } from './Button';
import { MicIcon } from './icons';

export interface AskBoxProps {
  /** The screen's own line — the box has no copy of its own. */
  placeholder: string;
  /** Controlled text; leave out for an uncontrolled box. */
  value?: string;
  onChange?: (text: string) => void;
  /** Enter, or the Ask button. Blank text never fires. */
  onAsk?: (text: string) => void;
  /** The microphone. Left out, the mic is still drawn but does nothing. */
  onMic?: () => void;
  /** Whether the microphone is drawn at all. The site's ask boxes have only the input and Ask. */
  mic?: boolean;
  /** The button's word. */
  askLabel?: string;
  /** The microphone's accessible name. */
  micLabel?: string;
  /** The input's accessible name. */
  label?: string;
  autoFocus?: boolean;
  className?: string;
}

/** The front door: an input on paper-2, the mic on paper, and the one pig button. */
export function AskBox({
  placeholder,
  value,
  onChange,
  onAsk,
  onMic,
  mic = true,
  askLabel = 'Ask',
  micLabel = 'Hold to talk to Wobo',
  label,
  autoFocus,
  className,
}: AskBoxProps) {
  const [own, setOwn] = useState('');
  const text = value ?? own;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const line = text.trim();
    if (!line) return;
    onAsk?.(line);
    if (value === undefined) setOwn('');
  };
  return (
    <form className={className ? `wk-ask ${className}` : 'wk-ask'} onSubmit={submit}>
      <input
        value={text}
        onChange={(e) => {
          if (value === undefined) setOwn(e.target.value);
          onChange?.(e.target.value);
        }}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        // biome-ignore lint/a11y/noAutofocus: the home screen is the box — focus belongs here on arrival
        autoFocus={autoFocus}
        autoComplete="off"
        enterKeyHint="send"
      />
      {mic && (
        <button type="button" className="wk-mic" aria-label={micLabel} onClick={onMic}>
          <MicIcon />
        </button>
      )}
      <Button tone="pig" size="sm" type="submit">
        {askLabel}
      </Button>
    </form>
  );
}
