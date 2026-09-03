'use client';

/**
 * The ask block near the end of a site page: Wobo's head, a label, one line, the ask box and a few
 * chips of questions people ask. The words are the page's own; the block adds nothing.
 *
 * Where the question goes: a signed-in learner's question is asked on the way and the conversation
 * opens; a visitor who is not signed in is taken to the door where signing in happens, because a
 * turn sent with no account would fail silently and look like Wobo ignoring them. A chip asks its
 * own question the same way.
 */

import { useRouter } from '../../shell/router';
import { useViewport } from '../../shell/useViewport';
import { useSdk } from '../../store/sdk';
import { AskBox, Chip, Label, WoboHead } from '../../ui/primitives';
import { useWoboChat } from '../../wobo/chat';

export interface AskWoboProps {
  /** The small pigment label. The prototypes say "Still wondering?". */
  label?: string;
  /** The line under it. */
  heading: string;
  /** The question already in the box, as a placeholder. */
  placeholder: string;
  /** Questions people ask, as chips. */
  chips?: readonly string[];
  /** The ask button's word. */
  askLabel?: string;
  className?: string;
}

export function AskWobo({
  label = 'Still wondering?',
  heading,
  placeholder,
  chips = [],
  askLabel,
  className,
}: AskWoboProps) {
  const router = useRouter();
  const sdk = useSdk();
  const chat = useWoboChat();
  const { width } = useViewport();
  const signedIn = sdk.config.devAuth || sdk.identity.isAuthenticated();
  const ask = (text: string) => {
    if (!signedIn) {
      router.navigate({ name: 'onboarding' });
      return;
    }
    void chat.ask(text);
    router.navigate({ name: 'chat' });
  };
  return (
    <div className={className ? `st-ask ${className}` : 'st-ask'}>
      <WoboHead size={width <= 900 ? 80 : 120} shadow />
      <div>
        <Label>{label}</Label>
        <h2 style={{ marginTop: 8 }}>{heading}</h2>
        <AskBox
          placeholder={placeholder}
          onAsk={ask}
          {...(askLabel ? { askLabel } : {})}
          label="Ask Wobo"
        />
        {chips.length > 0 ? (
          <div className="st-chips">
            {chips.map((chip) => (
              <Chip key={chip} onClick={() => ask(chip)}>
                {chip}
              </Chip>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
