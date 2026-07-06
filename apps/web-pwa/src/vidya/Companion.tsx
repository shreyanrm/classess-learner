'use client';

/**
 * The docked Vidya (DESIGN.md §4) — she flies in on every page, hovers on her light beam at the
 * bottom right, and one tap opens her full-height drawer on the right. Her words arrive in her
 * own hand — Caveat, written letter by letter. Her canvas ink lives in the overlay and fades;
 * nothing she draws is saved.
 */

import { useVidyaBus, VidyaBody } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from '../shell/router';
import { useProgress } from '../store/progress';
import { useSdk } from '../store/sdk';
import { CloseIcon, SendIcon, WaveformIcon } from '../ui/icons';
import { type ChatTurn, useVidyaChat } from './chat';
import { FlyingVidya } from './Flight';
import { TurnAttachments } from './paths';
import { MuteButton } from './speech';
import {
  modeWhisper,
  probeTeachBack,
  type TeachBackTurn,
  teachBackOpening,
  useTutor,
} from './tutor';
import { useVidyaVoice } from './voice';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Teach-back (VIDYA.md §8): she plays the student; the exchange is ephemeral, like her ink. */
interface TeachBack {
  topic: string;
  nodeId?: string;
  turns: TeachBackTurn[];
  probed: string[];
  done: boolean;
}

/** Her hand: letter-by-letter reveal for the newest line she speaks. */
function Handwritten({ text, animate }: { text: string; animate: boolean }) {
  const [shown, setShown] = useState(animate ? 0 : text.length);
  useEffect(() => {
    if (!animate) {
      setShown(text.length);
      return;
    }
    setShown(0);
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= text.length) clearInterval(timer);
    }, 22);
    return () => clearInterval(timer);
  }, [text, animate]);
  // her words sit on the page — no outline, no box; the learner's inputs carry the bubble
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 2px',
        fontSize: '0.92rem',
        lineHeight: 1.6,
        color: '#121316',
      }}
    >
      {text.slice(0, shown)}
      {shown < text.length && <span style={{ opacity: 0.4 }}>|</span>}
    </span>
  );
}

export function VidyaCompanion() {
  const { turns, ask, busy, mood, setMood } = useVidyaChat();
  const router = useRouter();
  const { route } = router;
  const bus = useVidyaBus();
  const sdk = useSdk();
  const { award } = useProgress();
  const { mode } = useTutor();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [voiceNote, setVoiceNote] = useState(false);
  const [tb, setTb] = useState<TeachBack | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const voice = useVidyaVoice({ setMood });
  const voiceOn =
    voice.status === 'listening' || voice.status === 'speaking' || voice.status === 'connecting';

  const lastVidyaId = [...turns].reverse().find((t) => t.role === 'vidya')?.id;

  // one scroll area, two threads: the conversation, or the ephemeral teach-back exchange
  const thread: { id: string; role: string; text: string }[] = tb ? tb.turns : turns;

  // what she is plugged into right now — the current topic makes teach-back possible.
  // gated by route: the bus's curriculum lingers after a course closes, the page does not.
  const ctx = open ? bus.assembleContext() : null;
  const onCourse = ctx !== null && (ctx.page.route === 'course' || ctx.page.route === 'sandbox');
  const topicName = onCourse
    ? (ctx.curriculum.nodeName ?? (ctx.page.state.title as string | undefined))
    : undefined;

  const startTeachBack = () => {
    if (!topicName) return;
    // the node id travels only when it provably belongs to this topic (the curriculum lingers)
    const rawNode = ctx?.curriculum.nodeName === topicName ? ctx?.curriculum.nodeId : undefined;
    const nodeId = rawNode && UUID_RE.test(rawNode) ? rawNode : undefined;
    setTb({
      topic: topicName,
      nodeId,
      turns: [{ id: 'tb-0', role: 'vidya', text: teachBackOpening(topicName) }],
      probed: [],
      done: false,
    });
    setMood('listening');
  };

  const endTeachBack = () => {
    setTb(null);
    setMood('idle');
  };

  // the learner teaches; she probes exactly one gap per turn — bonus XP when the lesson lands
  const submitTeachBack = (text: string) => {
    if (!tb) return;
    sdk.events.record(
      'vidya.turn.user.v1',
      {
        node_id: tb.nodeId,
        turn_id: crypto.randomUUID(),
        input_mode: 'text',
        text,
        has_audio: false,
      },
      { ontologyNodeId: tb.nodeId },
    );
    const r = probeTeachBack(text, tb.probed, tb.topic);
    sdk.events.record(
      'vidya.turn.assistant.v1',
      {
        node_id: tb.nodeId,
        turn_id: crypto.randomUUID(),
        assistance_level: 'challenge',
        hint_level: 0,
        grounded: false,
        track: 'track_2',
        handed_answer: false,
      },
      { ontologyNodeId: tb.nodeId },
    );
    const n = tb.turns.length;
    setTb({
      ...tb,
      turns: [
        ...tb.turns,
        { id: `tb-${n}-u`, role: 'learner', text },
        { id: `tb-${n}-v`, role: 'vidya', text: r.reply },
      ],
      probed: r.gap ? [...tb.probed, r.gap] : tb.probed,
      done: r.complete,
    });
    if (r.complete) {
      award('bonus', { onceKey: `teachback-${tb.topic}` });
      setMood('celebrate');
      window.setTimeout(() => setMood('idle'), 1600);
    }
  };

  const toggleVoice = () => {
    if (voiceOn) return voice.stop();
    void voice.start().then((landed) => {
      if (landed === 'unavailable') {
        setVoiceNote(true);
        window.setTimeout(() => setVoiceNote(false), 3000);
      }
    });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: length/open ARE the triggers — scroll on new turns and on expand
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns.length, open, busy, tb?.turns.length]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    if (tb && !tb.done) {
      submitTeachBack(text);
      return;
    }
    if (tb?.done) endTeachBack();
    void ask(text);
  };

  return (
    <>
      {!open && (
        <FlyingVidya
          routeKey={route.name}
          mood={busy ? 'thinking' : mood}
          onTap={() => setOpen(true)}
        />
      )}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: '104%' }}
            animate={{ x: 0 }}
            exit={{ x: '104%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(420px, 94vw)',
              zIndex: 'var(--clss-z-panel)' as unknown as number,
              background: 'var(--clss-frost-on-paper)',
              backdropFilter: 'blur(var(--clss-frost-blur))',
              WebkitBackdropFilter: 'blur(var(--clss-frost-blur))',
              borderLeft: '0.5px solid var(--clss-hairline-on-paper-strong)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderBottom: '0.5px solid var(--clss-hairline-on-paper)',
              }}
            >
              <VidyaBody
                size={46}
                mood={busy ? 'thinking' : open ? 'listening' : mood}
                gaze="pointer"
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--clss-ink-900)', lineHeight: 1.1 }}>
                  Vidya
                </div>
                {/* the quiet mode whisper — the assistance ladder, worn lightly */}
                <div style={{ fontSize: '0.75rem', color: 'var(--clss-ink-500)' }}>
                  {busy ? 'Thinking…' : tb ? 'Teach-back · she is the student' : modeWhisper(mode)}
                </div>
              </div>
              <MuteButton />
              {/* the drawer is a window onto the one conversation — this opens the whole thing */}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.navigate({ name: 'chat' });
                }}
                aria-label="Open the full conversation"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--clss-ink-500)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.78rem',
                  fontWeight: 550,
                  padding: 6,
                  whiteSpace: 'nowrap',
                }}
              >
                full chat ↗
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--clss-ink-500)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  lineHeight: 1,
                  padding: 6,
                }}
              >
                <CloseIcon size={16} />
              </button>
            </div>

            {/* teach-back rides above the thread — ephemeral, like her ink; nothing saved */}
            {tb && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 18px',
                  borderBottom: '0.5px solid var(--clss-hairline-on-paper)',
                  fontSize: '0.78rem',
                  color: 'var(--clss-ink-500)',
                }}
              >
                <span style={{ flex: 1 }}>you are teaching: {tb.topic.toLowerCase()}</span>
                <button
                  type="button"
                  onClick={endTeachBack}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--clss-ink-500)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.78rem',
                    fontWeight: 550,
                    padding: 4,
                  }}
                >
                  {tb.done ? 'back to chat' : 'stop teaching'}
                </button>
              </div>
            )}

            <div
              ref={scrollRef}
              style={{
                overflowY: 'auto',
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                flex: 1,
              }}
            >
              {thread.map((t) =>
                t.role === 'user' || t.role === 'learner' ? (
                  <div
                    key={t.id}
                    style={{
                      alignSelf: 'flex-end',
                      maxWidth: '85%',
                      padding: '8px 13px',
                      borderRadius: 'var(--clss-radius-md)',
                      fontSize: '0.92rem',
                      lineHeight: 1.5,
                      background: 'var(--clss-ink-900)',
                      color: 'var(--clss-paper)',
                    }}
                  >
                    {t.text}
                  </div>
                ) : (
                  <div
                    key={t.id}
                    style={{
                      alignSelf: 'flex-start',
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    <div style={{ maxWidth: '92%' }}>
                      <Handwritten
                        text={t.text}
                        animate={
                          tb
                            ? t.id === tb.turns[tb.turns.length - 1]?.id
                            : t.id === lastVidyaId && t.id !== 'seed'
                        }
                      />
                    </div>
                    {/* path results ride the same thread here as on the chat page */}
                    {!tb && (t as ChatTurn).extras && (
                      <div style={{ width: '100%' }}>
                        <TurnAttachments turn={t as ChatTurn} />
                      </div>
                    )}
                  </div>
                ),
              )}
              {busy && !tb && (
                <span
                  style={{
                    fontFamily: "'Caveat', cursive",
                    fontSize: '1.2rem',
                    color: 'var(--clss-ink-500)',
                  }}
                >
                  …
                </span>
              )}
            </div>

            {/* the teach-back door — only where there is a topic to teach */}
            {!tb && topicName && (
              <button
                type="button"
                onClick={startTeachBack}
                style={{
                  margin: '0 14px',
                  padding: '9px 12px',
                  border: '0.5px solid var(--clss-hairline-on-paper-strong)',
                  borderRadius: 'var(--clss-radius-sm)',
                  background: 'var(--clss-paper)',
                  color: 'var(--clss-ink-700)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                  textAlign: 'left',
                }}
              >
                teach her: {topicName.toLowerCase()} — she plays the student
              </button>
            )}

            <form
              onSubmit={submit}
              style={{
                display: 'flex',
                gap: 8,
                padding: 14,
                borderTop: '0.5px solid var(--clss-hairline-on-paper)',
                alignItems: 'center',
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => setMood('listening')}
                onBlur={() => setMood('idle')}
                placeholder={tb && !tb.done ? 'Explain it to her…' : 'Ask or do anything…'}
                style={{
                  flex: 1,
                  border: '0.5px solid var(--clss-hairline-on-paper-strong)',
                  borderRadius: 'var(--clss-radius-sm)',
                  padding: '10px 12px',
                  fontSize: '0.92rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                  background: 'var(--clss-paper)',
                  color: 'var(--clss-ink-900)',
                }}
              />
              <button
                type="button"
                onClick={toggleVoice}
                aria-label={voiceOn ? 'Stop voice' : 'Talk by voice'}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: voiceOn ? 'var(--clss-ink-900)' : 'var(--clss-ink-500)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                  padding: '0 2px',
                  whiteSpace: 'nowrap',
                }}
              >
                <WaveformIcon active={voiceOn} size={17} />
              </button>
              {/* the ask affordance exists only once there is something to ask */}
              <AnimatePresence initial={false}>
                {draft.trim() && (
                  <motion.button
                    key="ask"
                    type="submit"
                    disabled={busy}
                    initial={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.88 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                    style={{
                      border: 'none',
                      background: 'var(--clss-ink-900)',
                      color: 'var(--clss-paper)',
                      borderRadius: 'var(--clss-radius-sm)',
                      padding: '10px 14px',
                      cursor: busy ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                      fontSize: '0.9rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                    }}
                  >
                    <SendIcon size={13} /> ask
                  </motion.button>
                )}
              </AnimatePresence>
            </form>
            {voiceNote && (
              <div
                style={{
                  padding: '0 14px 10px',
                  color: 'var(--clss-ink-500)',
                  fontSize: '0.78rem',
                }}
              >
                voice arrives with a key
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
