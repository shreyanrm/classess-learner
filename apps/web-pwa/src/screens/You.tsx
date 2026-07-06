'use client';

/**
 * You — the page behind the whisper-quiet affordance (DESIGN.md §7). Not a settings dump:
 * one intention per section, progressive disclosure. Who you are, what you have earned,
 * who learns beside you, the note home, the plan, and three quiet dials at the end.
 */

import { useRegisterTarget, useVidyaBus } from '@classess/vidya';
import { AnimatePresence, motion } from 'framer-motion';
import {
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { chapterById, topicById } from '../data/catalog';
import type { Topic } from '../data/model';
import { useRouter } from '../shell/router';
import { useProgress } from '../store/progress';
import { useSdk } from '../store/sdk';
import { Card, Hairline, MagneticButton, SectionLabel } from '../ui/kit';
import { GradeBoardPicker } from './you/GradeBoardPicker';
import {
  boardName,
  getFlag,
  lastSevenDays,
  loadPhoto,
  loadProfile,
  markToday,
  PARENT_KEY,
  SOUND_KEY,
  type StoredProfile,
  savePhoto,
  saveProfile,
  setFlag,
  VOICE_KEY,
} from './you/profile';

const whisper: CSSProperties = { fontSize: '0.8rem', color: 'var(--clss-ink-300)' };
const bodyLine: CSSProperties = {
  fontSize: '0.85rem',
  color: 'var(--clss-ink-500)',
  lineHeight: 1.55,
};

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </section>
  );
}

/** A quiet switch — ink when on, paper when off, spring-settled knob. */
function Dial({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      style={{
        width: 38,
        height: 22,
        borderRadius: 999,
        border: on
          ? '0.5px solid var(--clss-ink-900)'
          : '0.5px solid var(--clss-hairline-on-paper-strong)',
        background: on ? 'var(--clss-ink-900)' : 'var(--clss-paper)',
        display: 'inline-flex',
        alignItems: 'center',
        padding: 0,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <motion.span
        animate={{ x: on ? 18 : 3 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        style={{
          width: 15,
          height: 15,
          borderRadius: 999,
          background: on ? 'var(--clss-paper)' : 'var(--clss-ink-300)',
          display: 'block',
        }}
      />
    </button>
  );
}

function DialRow({
  title,
  line,
  on,
  onChange,
}: {
  title: string;
  line: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '13px 0',
      }}
    >
      <div>
        <div style={{ fontSize: '0.95rem', color: 'var(--clss-ink-900)' }}>{title}</div>
        <div style={{ ...bodyLine, fontSize: '0.8rem', marginTop: 2 }}>{line}</div>
      </div>
      <Dial on={on} onChange={onChange} label={title} />
    </div>
  );
}

function InviteCard({
  title,
  line,
  copied,
  onCopy,
}: {
  title: string;
  line: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <Card style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--clss-ink-900)' }}>
        {title}
      </div>
      <div style={{ ...bodyLine, flex: 1 }}>{line}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 32 }}>
        <MagneticButton size="sm" variant="quiet" onClick={onCopy}>
          copy link
        </MagneticButton>
        <AnimatePresence>
          {copied && (
            <motion.span
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ fontSize: '0.8rem', color: 'var(--clss-ink-500)' }}
            >
              link copied
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

/** One strength line for the note home, composed from real data — pride first, always. */
function strengthLine(name: string, mastered: Topic[], xp: number): string {
  const last = mastered[mastered.length - 1];
  if (last) return `${name} can now solve ${last.name.toLowerCase()} on their own`;
  if (xp > 0) return `${name} is building a steady rhythm — the first mastery is close`;
  return `${name} has just begun — the first mastered topic lands here soon`;
}

export function You() {
  const router = useRouter();
  const sdk = useSdk();
  const bus = useVidyaBus();
  const { xp, streakDays, completed, award } = useProgress();

  // --- who you are -------------------------------------------------------
  const [profile, setProfile] = useState<StoredProfile>(() => loadProfile());
  const [nameDraft, setNameDraft] = useState(profile.name);
  const [changingSchool, setChangingSchool] = useState(false);
  const [photo, setPhoto] = useState<string | null>(() => loadPhoto());
  const fileRef = useRef<HTMLInputElement | null>(null);

  const commitProfile = (patch: Partial<StoredProfile>) => {
    const next = { ...profile, ...patch };
    setProfile(next);
    saveProfile(next);
    // Completing identity from here still counts — silent if onboarding already granted it.
    award('account');
  };

  const commitName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== profile.name) commitProfile({ name: trimmed });
    else setNameDraft(profile.name);
  };

  const onPhotoPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = 128; // ponytail: 128px square is plenty for a 64px circle on any display
      const c = document.createElement('canvas');
      c.width = side;
      c.height = side;
      const ctx = c.getContext('2d');
      if (ctx) {
        const m = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, side, side);
        const dataUrl = c.toDataURL('image/jpeg', 0.82);
        savePhoto(dataUrl);
        setPhoto(dataUrl);
        award('profile_photo'); // first set only — the default once-key guards it
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  // --- the ledger --------------------------------------------------------
  const [marks] = useState(() => markToday());
  const filament = useMemo(() => lastSevenDays(marks), [marks]);
  const activeDays = filament.filter((d) => d.active).length;

  // --- invites -----------------------------------------------------------
  const [copied, setCopied] = useState<'friend' | 'parent' | null>(null);
  const copyInvite = (kind: 'friend' | 'parent') => {
    const via = profile.name.toLowerCase().replace(/\s+/g, '-');
    const link = `https://classess.app/join?via=${encodeURIComponent(via)}&as=${kind}`;
    navigator.clipboard.writeText(link).catch(() => {
      // clipboard unavailable — the invitation still stands
    });
    setCopied(kind);
    window.setTimeout(() => setCopied((c) => (c === kind ? null : c)), 2200);
    award(kind === 'friend' ? 'invite_friend' : 'invite_parent', { onceKey: `invite_${kind}` });
  };

  // --- the trophy shelf --------------------------------------------------
  const mastered = useMemo(
    () =>
      Array.from(completed)
        .map((id) => topicById(id))
        .filter((t): t is Topic => Boolean(t)),
    [completed],
  );

  // --- the note home -----------------------------------------------------
  const [parentPhone, setParentPhone] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(PARENT_KEY);
      return raw ? (JSON.parse(raw) as { phone: string }).phone : null;
    } catch {
      return null;
    }
  });
  const [phoneDraft, setPhoneDraft] = useState('');
  const [phoneNudge, setPhoneNudge] = useState(false);
  const linkParent = () => {
    const digits = phoneDraft.replace(/\D/g, '');
    if (digits.length < 8) {
      setPhoneNudge(true);
      return;
    }
    setPhoneNudge(false);
    const phone = phoneDraft.trim();
    try {
      localStorage.setItem(
        PARENT_KEY,
        JSON.stringify({ phone, linkedAt: new Date().toISOString() }),
      );
    } catch {
      // storage unavailable — the link lives for this session
    }
    setParentPhone(phone);
    sdk.events.record('parent.linked.v1', {
      parent_ref: crypto.randomUUID(),
      relationship: 'parent',
      channel: 'whatsapp',
    });
  };

  // --- settings ----------------------------------------------------------
  const [voice, setVoice] = useState(() => getFlag(VOICE_KEY));
  const [sound, setSound] = useState(() => getFlag(SOUND_KEY));
  const [confirmingReset, setConfirmingReset] = useState(false);
  const startOver = () => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k?.startsWith('clss-')) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
    // ONBOARDED_KEY is gone — the app reopens on onboarding, genuinely fresh.
    window.location.reload();
  };

  // --- Vidya reads this page ---------------------------------------------
  const ledgerRef = useRegisterTarget<HTMLDivElement>('you-ledger', {
    kind: 'stat',
    label: 'the xp ledger — total xp, learner days, and the seven-day activity filament',
  });
  const shelfRef = useRegisterTarget<HTMLDivElement>('you-shelf', {
    kind: 'list',
    label: 'the shelf of mastered courses',
  });
  const noteRef = useRegisterTarget<HTMLDivElement>('you-weekly-note', {
    kind: 'card',
    label: 'the preview of the weekly note that goes home to a parent',
  });
  const planRef = useRegisterTarget<HTMLDivElement>('you-plan', {
    kind: 'card',
    label: 'the plan card — free today, superstar when ready',
  });

  useEffect(() => {
    bus.publishPage({
      route: 'you',
      state: {
        name: profile.name,
        grade: profile.grade,
        board: boardName(profile.boardId),
        xp,
        learnerDays: streakDays,
        masteredTopics: mastered.map((t) => t.name),
        parentLinked: Boolean(parentPhone),
      },
    });
  }, [bus, profile, xp, streakDays, mastered, parentPhone]);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '84px 24px 96px',
      }}
    >
      {/* home — the way back, a whisper */}
      <button
        type="button"
        onClick={() => (router.canGoBack ? router.back() : router.navigate({ name: 'home' }))}
        style={{
          position: 'fixed',
          top: 20,
          left: 24,
          border: 'none',
          background: 'transparent',
          color: 'var(--clss-ink-500)',
          fontSize: '0.85rem',
          cursor: 'pointer',
          fontFamily: 'inherit',
          padding: 4,
        }}
      >
        ← home
      </button>

      <div
        style={{ width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 40 }}
      >
        {/* ---- the learner ---- */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <button
            type="button"
            aria-label={photo ? 'change your profile photo' : 'add a profile photo'}
            onClick={() => fileRef.current?.click()}
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              border: '0.5px solid var(--clss-hairline-on-paper-strong)',
              background: 'var(--clss-paper)',
              overflow: 'hidden',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {photo ? (
              <img
                src={photo}
                alt={profile.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <span style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--clss-ink-900)' }}>
                {profile.name.charAt(0).toUpperCase()}
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onPhotoPick}
            style={{ display: 'none' }}
            aria-hidden="true"
            tabIndex={-1}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              aria-label="your name"
              style={{
                fontSize: '1.7rem',
                fontWeight: 500,
                letterSpacing: '-0.02em',
                color: 'var(--clss-ink-900)',
                fontFamily: 'inherit',
                background: 'transparent',
                border: 'none',
                borderBottom: '0.5px solid transparent',
                outline: 'none',
                padding: 0,
                width: '100%',
              }}
            />
            <button
              type="button"
              onClick={() => setChangingSchool((s) => !s)}
              style={{
                border: 'none',
                background: 'transparent',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                color: 'var(--clss-ink-500)',
                cursor: 'pointer',
                padding: 0,
                textAlign: 'left',
              }}
            >
              {profile.grade} · {boardName(profile.boardId)}{' '}
              <span style={{ color: 'var(--clss-ink-300)' }}>
                · {changingSchool ? 'done' : 'change'}
              </span>
            </button>
          </div>
        </header>

        <AnimatePresence>
          {changingSchool && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              style={{ marginTop: -22 }}
            >
              <GradeBoardPicker
                grade={profile.grade}
                boardId={profile.boardId}
                onGrade={(g) => commitProfile({ grade: g })}
                onBoard={(b) => commitProfile({ boardId: b })}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- the ledger ---- */}
        <div ref={ledgerRef}>
          <Section label="the ledger">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span
                style={{
                  fontSize: '2.6rem',
                  fontWeight: 500,
                  letterSpacing: '-0.03em',
                  color: 'var(--clss-ink-900)',
                  lineHeight: 1,
                }}
              >
                {xp.toLocaleString('en-IN')}
              </span>
              <span style={{ fontSize: '0.95rem', color: 'var(--clss-ink-500)' }}>xp</span>
            </div>
            <div style={{ fontSize: '0.95rem', color: 'var(--clss-ink-700)' }}>
              day {streakDays} of being a learner
            </div>
            <div
              role="img"
              aria-label={`active on ${activeDays} of the last 7 days`}
              style={{ display: 'flex', gap: 6, maxWidth: 260, marginTop: 4 }}
            >
              {filament.map((d) => (
                <span
                  key={d.day}
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 2,
                    background: d.active
                      ? 'var(--clss-ink-900)'
                      : 'var(--clss-hairline-on-paper-strong)',
                  }}
                />
              ))}
            </div>
            <div style={whisper}>rest is part of learning — quiet days are allowed</div>
          </Section>
        </div>

        <Hairline />

        {/* ---- invite ---- */}
        <Section label="learning is better shared">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: 12,
            }}
          >
            <InviteCard
              title="invite a friend"
              line="when your friend finishes their first topic, you both unlock a bonus lesson."
              copied={copied === 'friend'}
              onCopy={() => copyInvite('friend')}
            />
            <InviteCard
              title="invite a parent"
              line="give them a window into your learning — the weekly note shows them what you can now do."
              copied={copied === 'parent'}
              onCopy={() => copyInvite('parent')}
            />
          </div>
        </Section>

        <Hairline />

        {/* ---- past courses: the trophy shelf ---- */}
        <div ref={shelfRef}>
          <Section label="past courses">
            {mastered.length === 0 ? (
              <div
                style={{
                  border: '0.5px solid var(--clss-hairline-on-paper)',
                  borderRadius: 'var(--clss-radius-sm)',
                  padding: '26px 20px',
                  textAlign: 'center',
                  ...whisper,
                }}
              >
                your first finished course lands here
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 12,
                }}
              >
                {mastered.map((t) => (
                  <Card key={t.id} style={{ padding: 16, position: 'relative' }}>
                    {/* the corner tick — ultramarine, the mastery pigment */}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                      style={{ position: 'absolute', top: 12, right: 12 }}
                    >
                      <path
                        d="M2.5 7.5 5.5 10.5 11.5 3.5"
                        stroke="var(--clss-ultramarine)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 500,
                        color: 'var(--clss-ink-900)',
                        paddingRight: 20,
                      }}
                    >
                      {t.name}
                    </div>
                    <div style={{ ...whisper, marginTop: 4 }}>{chapterById(t.chapterId)?.name}</div>
                    <div
                      style={{ fontSize: '0.8rem', color: 'var(--clss-ink-500)', marginTop: 10 }}
                    >
                      mastered
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Section>
        </div>

        <Hairline />

        {/* ---- the note home ---- */}
        <div ref={noteRef}>
          <Section label="the note home">
            <Card style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
              >
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--clss-ink-500)',
                    letterSpacing: '0.06em',
                  }}
                >
                  the weekly note
                </span>
                <span style={whisper}>preview</span>
              </div>
              <div
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                  color: 'var(--clss-ink-900)',
                  lineHeight: 1.4,
                }}
              >
                {profile.name} showed up {activeDays} of 7 days this week
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--clss-ink-700)' }}>
                {mastered.length} {mastered.length === 1 ? 'topic' : 'topics'} mastered ·{' '}
                {xp.toLocaleString('en-IN')} xp earned
              </div>
              <div style={{ ...bodyLine, fontSize: '0.9rem' }}>
                {strengthLine(profile.name, mastered, xp)}
              </div>
              <div style={{ ...whisper, marginTop: 6 }}>
                arrives on WhatsApp, in your language — pride first, always
              </div>
            </Card>

            {parentPhone ? (
              <div style={bodyLine}>
                linked · {parentPhone} — they'll receive the weekly note on WhatsApp when we go live
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="tel"
                    value={phoneDraft}
                    onChange={(e) => setPhoneDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && linkParent()}
                    placeholder="a parent's phone number"
                    aria-label="a parent's phone number"
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      fontSize: '0.95rem',
                      fontFamily: 'inherit',
                      border: '0.5px solid var(--clss-hairline-on-paper-strong)',
                      borderRadius: 'var(--clss-radius-sm)',
                      outline: 'none',
                      background: 'var(--clss-paper)',
                      color: 'var(--clss-ink-900)',
                      minWidth: 0,
                    }}
                  />
                  <MagneticButton size="sm" variant="quiet" onClick={linkParent}>
                    link a parent
                  </MagneticButton>
                </div>
                {phoneNudge && (
                  <div style={whisper}>that number looks short — check it once more</div>
                )}
              </div>
            )}
          </Section>
        </div>

        <Hairline />

        {/* ---- the plan ---- */}
        <div ref={planRef}>
          <Section label="your plan">
            <Card style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
              >
                <span
                  style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--clss-ink-900)' }}
                >
                  free
                </span>
                <span style={whisper}>your plan today</span>
              </div>
              <div style={bodyLine}>everything you need to learn well, every single day.</div>
              <Hairline style={{ margin: '10px 0' }} />
              <div style={{ fontSize: '0.95rem', color: 'var(--clss-ink-900)' }}>
                superstar — ₹999/mo · ₹8,999/yr
              </div>
              <div style={bodyLine}>
                for when you're ready to push your limits. we never discount — learners who show up
                get gifted superstar weeks instead.
              </div>
            </Card>
          </Section>
        </div>

        <Hairline />

        {/* ---- settings ---- */}
        <Section label="settings">
          <div>
            <DialRow
              title="Vidya's voice"
              line="she speaks her replies out loud"
              on={voice}
              onChange={(v) => {
                setVoice(v);
                setFlag(VOICE_KEY, v);
              }}
            />
            <Hairline />
            <DialRow
              title="the ignite sound"
              line="a sub-second note when something is genuinely mastered"
              on={sound}
              onChange={(v) => {
                setSound(v);
                setFlag(SOUND_KEY, v);
              }}
            />
            <Hairline />
            <div style={{ padding: '13px 0' }}>
              {confirmingReset ? (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <div style={bodyLine}>
                    this clears your name, photo, progress, and settings from this device. it cannot
                    be undone.
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <MagneticButton size="sm" variant="quiet" onClick={startOver}>
                      erase and start over
                    </MagneticButton>
                    <MagneticButton
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmingReset(false)}
                    >
                      keep going
                    </MagneticButton>
                  </div>
                </motion.div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingReset(true)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '0.95rem', color: 'var(--clss-ink-900)' }}>
                    start over
                  </div>
                  <div style={{ ...bodyLine, fontSize: '0.8rem', marginTop: 2 }}>
                    erase everything on this device and begin again
                  </div>
                </button>
              )}
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
