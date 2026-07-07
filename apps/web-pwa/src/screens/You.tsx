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
import { topicById } from '../data/catalog';
import type { Topic } from '../data/model';
import { useRouter } from '../shell/router';
import {
  clearMind,
  type KnownItem,
  lifetimeSnapshot,
  loadMind,
  loadProactivity,
  observationLines,
  type Proactivity,
  removableItems,
  removeFact,
  removeInterest,
  saveProactivity,
} from '../store/mind';
import { FREEZE_BUDGET, levelInfo, useProgress } from '../store/progress';
import { useSdk } from '../store/sdk';
import { LevelBadge } from '../ui/AppHeader';
import { paintAccess } from '../ui/access';
import {
  ANIMAL_IDS,
  type AvatarChoice,
  type AvatarId,
  avatarName,
  BUDDY_IDS,
  CastAvatar,
  loadAvatarChoice,
  renderAvatar,
  saveAvatarChoice,
} from '../ui/avatars';
import { Scene } from '../ui/cast';
import { Card, cascade, Hairline, MagneticButton, rise, SectionLabel } from '../ui/kit';
import { setThemePref, type ThemePref, useThemePref } from '../ui/theme';
import { loadViewPref, saveViewPref } from '../ui/viewPref';
import { Whisper } from './Learn';
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
import { TrophyRoom } from './you/TrophyRoom';

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

const PROACTIVITY_LINES: Record<Proactivity, string> = {
  quiet: 'she waits to be asked — no suggestions, no nudges',
  balanced: 'gentle suggestion chips at the right moments',
  proactive: 'she speaks up when she sees something worth your time',
};

/** Three quiet notches — how forward Vidya is allowed to be. */
function ProactivityRow({
  value,
  onChange,
}: {
  value: Proactivity;
  onChange: (p: Proactivity) => void;
}) {
  const options: Proactivity[] = ['quiet', 'balanced', 'proactive'];
  return (
    <div style={{ padding: '13px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontSize: '0.95rem', color: 'var(--clss-ink-900)' }}>how forward she is</div>
        <div style={{ ...bodyLine, fontSize: '0.8rem', marginTop: 2 }}>
          {PROACTIVITY_LINES[value]}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, maxWidth: 340 }}>
        {options.map((p) => {
          const on = p === value;
          return (
            <button
              key={p}
              type="button"
              aria-pressed={on}
              aria-label={`${p} — ${PROACTIVITY_LINES[p]}`}
              onClick={() => onChange(p)}
              style={{
                flex: 1,
                height: 34,
                borderRadius: 3,
                border: on ? '0.5px solid var(--clss-ink-900)' : '0.5px solid transparent',
                background: on ? 'var(--clss-ink-900)' : 'var(--clss-tonal)',
                color: on ? 'var(--clss-paper)' : 'var(--clss-ink-700)',
                fontFamily: 'inherit',
                fontSize: '0.8rem',
                fontWeight: on ? 550 : 400,
                cursor: 'pointer',
                transition: 'background 0.2s ease, color 0.2s ease',
              }}
            >
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const APPEARANCE_LINES: Record<ThemePref, string> = {
  light: 'the paper canvas — bright and open',
  dark: 'soft graphite — subtle, easy at night',
  system: 'follows your device, light by day and dark by night',
};

/** Light / dark / system — the appearance picker. Subtle graphite, never black. */
function AppearanceRow() {
  const pref = useThemePref();
  const options: ThemePref[] = ['light', 'dark', 'system'];
  return (
    <div style={{ padding: '13px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontSize: '0.95rem', color: 'var(--clss-ink-900)' }}>appearance</div>
        <div style={{ ...bodyLine, fontSize: '0.8rem', marginTop: 2 }}>
          {APPEARANCE_LINES[pref]}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, maxWidth: 340 }}>
        {options.map((p) => {
          const on = p === pref;
          return (
            <button
              key={p}
              type="button"
              aria-pressed={on}
              aria-label={`${p} — ${APPEARANCE_LINES[p]}`}
              onClick={() => setThemePref(p)}
              style={{
                flex: 1,
                height: 34,
                borderRadius: 3,
                border: on ? '0.5px solid var(--clss-ink-900)' : '0.5px solid transparent',
                background: on ? 'var(--clss-ink-900)' : 'var(--clss-tonal)',
                color: on ? 'var(--clss-paper)' : 'var(--clss-ink-700)',
                fontFamily: 'inherit',
                fontSize: '0.8rem',
                fontWeight: on ? 550 : 400,
                cursor: 'pointer',
                transition: 'background 0.2s ease, color 0.2s ease',
              }}
            >
              {p}
            </button>
          );
        })}
      </div>
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

/** Tiles land lighter than full sections — a short rise and settle. */
const tilePop = {
  hidden: { opacity: 0, y: 10, scale: 0.86 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 380, damping: 24 },
  },
} as const;

const SELECT_RING = { boxShadow: '0 0 0 2px var(--clss-ultramarine)' } as const;

/** One face tile in the picker — spring hover, ultramarine ring when it is the current choice. */
function AvatarTile({
  id,
  selected,
  onPick,
}: {
  id: AvatarId;
  selected: boolean;
  onPick: (id: AvatarId) => void;
}) {
  return (
    <motion.button
      type="button"
      variants={tilePop}
      whileHover={{ scale: 1.09, y: -2 }}
      whileTap={{ scale: 0.92 }}
      onClick={() => onPick(id)}
      aria-label={`be ${avatarName(id)}`}
      aria-pressed={selected}
      style={{
        border: 'none',
        background: 'transparent',
        padding: 0,
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <CastAvatar id={id} size={54} style={selected ? SELECT_RING : undefined} />
      <span
        style={{
          fontSize: '0.65rem',
          textTransform: 'lowercase',
          color: selected ? 'var(--clss-ultramarine)' : 'var(--clss-ink-300)',
        }}
      >
        {avatarName(id)}
      </span>
    </motion.button>
  );
}

/** The face editor — a light frost popover: the cast as tiles, a photo, or your initial. */
function AvatarPicker({
  open,
  choice,
  hasPhoto,
  onPickCast,
  onUpload,
  onInitial,
  onClose,
}: {
  open: boolean;
  choice: AvatarChoice | null;
  hasPhoto: boolean;
  onPickCast: (id: AvatarId) => void;
  onUpload: () => void;
  onInitial: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      // the anchor button toggles itself — closing here would make its click reopen
      if (t?.closest('[data-avatar-anchor]')) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const quietTile: CSSProperties = {
    flex: 1,
    height: 34,
    borderRadius: 3,
    border: 'none',
    background: 'var(--clss-tonal)',
    fontFamily: 'inherit',
    fontSize: '0.8rem',
    color: 'var(--clss-ink-700)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    padding: '0 12px',
  };
  const ring = { boxShadow: '0 0 0 2px var(--clss-ultramarine)' } as const;
  const eyebrow: CSSProperties = {
    fontSize: '0.62rem',
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--clss-ink-300)',
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-label="choose your avatar"
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          style={{
            position: 'absolute',
            top: 74,
            left: 0,
            zIndex: 30,
            width: 'min(324px, calc(100vw - 48px))',
            maxHeight: 'min(72vh, 560px)',
            overflowY: 'auto',
            padding: 16,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.93)',
            backdropFilter: 'blur(18px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(18px) saturate(1.6)',
            border: '0.5px solid var(--clss-hairline-on-paper-strong)',
            transformOrigin: 'top left',
          }}
        >
          <motion.div
            variants={cascade}
            initial="hidden"
            animate="show"
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <motion.div variants={tilePop} style={whisper}>
              pick your look
            </motion.div>
            {(
              [
                ['buddies', BUDDY_IDS],
                ['animals', ANIMAL_IDS],
              ] as const
            ).map(([label, ids]) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <motion.div variants={tilePop} style={eyebrow}>
                  {label}
                </motion.div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {ids.map((id) => (
                    <AvatarTile
                      key={id}
                      id={id}
                      selected={choice?.kind === 'cast' && choice.castId === id}
                      onPick={onPickCast}
                    />
                  ))}
                </div>
              </div>
            ))}
            <Hairline />
            <motion.div variants={tilePop} style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={onUpload}
                style={{
                  ...quietTile,
                  ...(choice?.kind === 'photo' && hasPhoto ? ring : undefined),
                }}
              >
                upload a picture
              </button>
              <button
                type="button"
                onClick={onInitial}
                style={{ ...quietTile, ...(choice?.kind === 'initial' ? ring : undefined) }}
              >
                use my initial
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** One strength line for the note home, composed from real data — pride first, always. */
function strengthLine(name: string, mastered: Topic[], xp: number): string {
  const last = mastered[mastered.length - 1];
  if (last) return `${name} can now solve ${last.name} on their own`;
  if (xp > 0) return `${name} is building a steady rhythm — the first mastery is close`;
  return `${name} has just begun — the first mastered topic lands here soon`;
}

export function You() {
  const router = useRouter();
  const sdk = useSdk();
  const bus = useVidyaBus();
  const { xp, streakDays, completed, award, streakRepair, freezesLeft, repairStreak } =
    useProgress();
  const level = levelInfo(xp);

  // --- who you are -------------------------------------------------------
  const [profile, setProfile] = useState<StoredProfile>(() => loadProfile());
  const [nameDraft, setNameDraft] = useState(profile.name);
  const [changingSchool, setChangingSchool] = useState(false);
  const [photo, setPhoto] = useState<string | null>(() => loadPhoto());
  const [choice, setChoice] = useState<AvatarChoice | null>(() => loadAvatarChoice());
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const applyChoice = (next: AvatarChoice) => {
    saveAvatarChoice(next);
    setChoice(next);
    // choosing a face counts once, photo or cast — the default once-key guards repeats
    if (next.kind !== 'initial') award('profile_photo');
  };

  const commitProfile = (patch: Partial<StoredProfile>) => {
    const next = { ...profile, ...patch };
    setProfile(next);
    saveProfile(next);
    // Completing identity from here still counts — silent if onboarding already granted it.
    award('account');
  };

  // Preference edits (accessibility, language) don't award XP; they persist, repaint the real
  // display effects, and refresh her dossier so the next turn already honors them.
  const patchProfile = (patch: Partial<StoredProfile>) => {
    const next = { ...profile, ...patch };
    setProfile(next);
    saveProfile(next);
    paintAccess({ largeText: next.largeText, highContrast: next.highContrast });
    bus.publishLifetime(lifetimeSnapshot());
  };

  // The grade/board a session opened on — a change from it shows the honest migration note.
  const schoolBaseline = useRef({ grade: profile.grade, boardId: profile.boardId });
  const schoolChanged =
    profile.grade !== schoolBaseline.current.grade ||
    profile.boardId !== schoolBaseline.current.boardId;

  // Streak-freeze repair (family P): a broken chain repairs against the monthly budget with a
  // stated reason. She confirms what she did and what remains; the confirmation lingers this session.
  const [repairReason, setRepairReason] = useState('');
  const [repaired, setRepaired] = useState<{ days: number; left: number } | null>(null);
  const doRepair = () => {
    if (!streakRepair) return;
    const days = streakRepair.brokenDays;
    if (repairStreak(repairReason)) {
      setRepaired({ days, left: freezesLeft - 1 });
      setRepairReason('');
    }
  };

  // Re-onboard door: walk the intro again without wiping mastery (progress lives in learner_state,
  // not the profile onboarding rewrites). Just re-enter the flow — finishing re-sets the flag.
  const redoSetup = () => router.navigate({ name: 'onboarding' });

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
        applyChoice({ kind: 'photo' }); // awards profile_photo once, first set of either kind
        setPickerOpen(false);
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

  // --- her memory of you (steerable, per-item — the forget verb's visual twin) ----------
  const [mind, setMind] = useState(() => loadMind());
  const [mindCleared, setMindCleared] = useState(false);
  const knownItems = useMemo(() => removableItems(mind), [mind]);
  const observations = useMemo(() => observationLines(mind), [mind]);
  // Every removal re-reads storage, then refreshes her live lifetime slot so the very next turn
  // carries the corrected dossier (MindObserver also republishes on its pulse).
  const refreshMind = () => {
    setMind(loadMind());
    bus.publishLifetime(lifetimeSnapshot());
  };
  const removeItem = (item: KnownItem) => {
    if (item.kind === 'fact') removeFact(item.text);
    else removeInterest(item.text);
    refreshMind();
  };
  const forgetMind = () => {
    clearMind();
    setMind(loadMind());
    setMindCleared(true);
    // the lifetime slot empties immediately — her next call carries nothing about you
    bus.publishLifetime({});
    window.setTimeout(() => setMindCleared(false), 2600);
  };

  // --- settings ----------------------------------------------------------
  const [voice, setVoice] = useState(() => getFlag(VOICE_KEY));
  const [sound, setSound] = useState(() => getFlag(SOUND_KEY));
  const [adventure, setAdventure] = useState(() => loadViewPref() === 'adventure');
  const [proactivity, setProactivity] = useState<Proactivity>(() => loadProactivity());
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const signOut = () => {
    setSigningOut(true);
    // End the session, then boot fresh: the live-mode guard lands on onboarding's sign-in beat.
    // Local progress stays cached on-device and reconciles when this account signs back in.
    void sdk.identity.auth.signOut().finally(() => window.location.assign('/'));
  };
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
  const mindRef = useRegisterTarget<HTMLDivElement>('you-mind', {
    kind: 'card',
    label: 'the card showing what Vidya has learned about this learner, with a clear-memory door',
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
      <Whisper
        onClick={() => (router.canGoBack ? router.back() : router.navigate({ name: 'home' }))}
      >
        Home
      </Whisper>

      <motion.div
        variants={cascade}
        initial="hidden"
        animate="show"
        style={{ width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 40 }}
      >
        {/* ---- the learner ---- */}
        <motion.header
          variants={rise}
          // zIndex lifts the open picker above later sibling sections (their springs create stacking contexts)
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            position: 'relative',
            zIndex: 5,
          }}
        >
          <button
            type="button"
            aria-label="choose your avatar"
            aria-expanded={pickerOpen}
            data-avatar-anchor
            onClick={() => setPickerOpen((o) => !o)}
            style={{
              width: 64,
              height: 64,
              borderRadius: 3,
              border: '0.5px solid var(--clss-hairline-on-paper-strong)',
              background: 'var(--clss-paper)',
              overflow: 'hidden',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {/* the small pop — a new face lands with a settle */}
            <motion.span
              key={`${choice?.kind ?? 'none'}-${choice?.castId ?? ''}-${photo ? 'p' : ''}`}
              initial={{ scale: 1.16 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 340, damping: 19 }}
              style={{ display: 'block' }}
            >
              {renderAvatar({ name: profile.name, photo, choice }, 62)}
            </motion.span>
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
          <AvatarPicker
            open={pickerOpen}
            choice={choice}
            hasPhoto={Boolean(photo)}
            onPickCast={(id) => applyChoice({ kind: 'cast', castId: id })}
            onUpload={() => fileRef.current?.click()}
            onInitial={() => applyChoice({ kind: 'initial' })}
            onClose={() => setPickerOpen(false)}
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
        </motion.header>

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
              {/* the honest migration note — what carries over when they move class/board */}
              {schoolChanged && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                  style={{
                    marginTop: 14,
                    padding: '12px 14px',
                    borderRadius: 3,
                    background: 'rgba(31,53,224,0.05)',
                    border: '1px solid rgba(31,53,224,0.1)',
                    ...bodyLine,
                    fontSize: '0.85rem',
                    color: 'var(--clss-ink-700)',
                  }}
                >
                  moving to {profile.grade} · {boardName(profile.boardId)}. your{' '}
                  {xp.toLocaleString('en-IN')} xp, your day-{streakDays} streak, and the{' '}
                  {mastered.length} {mastered.length === 1 ? 'topic' : 'topics'} you've mastered all
                  carry over — I'll refit the course map to the new class and board.
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- the ledger ---- */}
        <motion.div variants={rise} ref={ledgerRef}>
          <Section label="the ledger">
            {/* the earned record sits on its own ultramarine-tinted stage */}
            <div
              style={{
                background: 'rgba(31,53,224,0.05)',
                border: '1px solid rgba(31,53,224,0.1)',
                borderRadius: 3,
                padding: '26px 26px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span
                    style={{
                      fontSize: '3rem',
                      fontWeight: 650,
                      letterSpacing: '-0.035em',
                      color: 'var(--clss-ink-900)',
                      lineHeight: 1,
                    }}
                  >
                    {xp.toLocaleString('en-IN')}
                  </span>
                  <span style={{ fontSize: '0.95rem', color: 'var(--clss-ink-500)' }}>xp</span>
                </div>
                {/* the level medallion — bigger here, with the xp-to-next spelled out */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--clss-ink-500)',
                        fontWeight: 600,
                      }}
                    >
                      level {level.level}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--clss-ink-700)' }}>
                      {level.toNext} xp to level {level.level + 1}
                    </div>
                  </div>
                  <LevelBadge info={level} celebrate={false} size={56} />
                </div>
              </div>
              <div style={{ fontSize: '0.95rem', color: 'var(--clss-ink-700)' }}>
                day {streakDays} of being a learner
              </div>
              <div
                role="img"
                aria-label={`active on ${activeDays} of the last 7 days`}
                style={{ display: 'flex', gap: 6, maxWidth: 260 }}
              >
                {filament.map((d) => (
                  <span
                    key={d.day}
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 2,
                      background: d.active ? 'var(--clss-ink-900)' : 'rgba(31,53,224,0.14)',
                    }}
                  />
                ))}
              </div>
              {/* the month at a glance — intensity, not just presence */}
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  color: 'var(--clss-ink-faint)',
                  marginTop: 18,
                  marginBottom: 10,
                }}
              >
                ACTIVITY · 30 DAYS
              </div>
              <div
                role="img"
                aria-label="this month's activity intensity"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(10, 1fr)',
                  gap: 6,
                  maxWidth: 380,
                }}
              >
                {Array.from({ length: 30 }, (_, i) => {
                  const d = new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10);
                  let n = 0;
                  try {
                    n =
                      (
                        JSON.parse(
                          localStorage.getItem('clss-activity-counts-v1') ?? '{}',
                        ) as Record<string, number>
                      )[d] ?? 0;
                  } catch {
                    n = 0;
                  }
                  if (n === 0 && marks.includes(d)) n = 1;
                  const RAMP = ['var(--clss-tonal)', '#D5EDDD', '#A9DCBB', '#6FC28D', '#3FA764'];
                  const fill =
                    RAMP[Math.min(4, n === 0 ? 0 : n <= 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : 4)];
                  return (
                    <motion.span
                      key={d}
                      title={`${d} — ${n} moments`}
                      whileHover={{ scale: 1.18 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      style={{
                        aspectRatio: '1',
                        borderRadius: 4,
                        background: fill,
                        display: 'block',
                      }}
                    />
                  );
                })}
              </div>
              <div style={whisper}>rest is part of learning — quiet days are allowed</div>
            </div>
          </Section>
        </motion.div>

        {/* ---- the streak-freeze repair (family P) ---- */}
        <AnimatePresence>
          {(streakRepair || repaired) && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            >
              <Card style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {repaired ? (
                  <>
                    <div
                      style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--clss-ink-900)' }}
                    >
                      done — your {repaired.days}-day streak is back
                    </div>
                    <div style={bodyLine}>
                      I froze the gap you told me about. {repaired.left} of {FREEZE_BUDGET} freezes
                      left this month — they refresh on the 1st.
                    </div>
                  </>
                ) : streakRepair ? (
                  <>
                    <div
                      style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--clss-ink-900)' }}
                    >
                      your {streakRepair.brokenDays}-day streak broke
                    </div>
                    <div style={bodyLine}>
                      life happens — illness, exams, a trip. tell me why and I'll freeze that gap so
                      your streak stands.{' '}
                      {freezesLeft > 0
                        ? `${freezesLeft} of ${FREEZE_BUDGET} freezes left this month.`
                        : 'no freezes left this month — they refresh on the 1st.'}
                    </div>
                    {freezesLeft > 0 && (
                      <div style={{ display: 'flex', gap: 10 }}>
                        <input
                          value={repairReason}
                          onChange={(e) => setRepairReason(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && doRepair()}
                          placeholder="what got in the way?"
                          aria-label="the reason for the missed days"
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
                        <MagneticButton
                          size="sm"
                          variant="quiet"
                          onClick={doRepair}
                          disabled={!repairReason.trim()}
                        >
                          repair my streak
                        </MagneticButton>
                      </div>
                    )}
                  </>
                ) : null}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <Hairline />

        {/* ---- invite ---- */}
        <motion.div variants={rise}>
          <Section label="learning is better shared">
            {/* the cast gathers — the world that learns beside you */}
            <Scene
              height={150}
              hue="var(--clss-ultramarine)"
              wash={0.05}
              items={[
                { id: 'torto', x: 0.07, size: 64 },
                { id: 'pip', x: 0.2, size: 86, mood: 'happy' },
                { id: 'books', x: 0.32, size: 54 },
                { id: 'sage', x: 0.46, size: 82 },
                { id: 'volt', x: 0.62, size: 86, mood: 'delighted' },
                { id: 'juni', x: 0.75, size: 44, lift: 46 },
                { id: 'sprout', x: 0.89, size: 66 },
              ]}
            />
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
        </motion.div>

        <Hairline />

        {/* ---- the trophy room ---- */}
        <motion.div variants={rise} ref={shelfRef}>
          <Section label="your trophy room">
            <TrophyRoom mastered={mastered} xp={xp} streakDays={streakDays} />
          </Section>
        </motion.div>

        <Hairline />

        {/* ---- the note home ---- */}
        <motion.div variants={rise} ref={noteRef}>
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
        </motion.div>

        <Hairline />

        {/* ---- the plan ---- */}
        <motion.div variants={rise} ref={planRef}>
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
        </motion.div>

        <Hairline />

        {/* ---- what Vidya knows about you ---- */}
        <motion.div variants={rise} ref={mindRef}>
          <Section label="what Vidya knows about you">
            <Card style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {knownItems.length === 0 && observations.length === 0 ? (
                <div style={bodyLine}>
                  {mindCleared
                    ? 'cleared — she starts fresh from your next answer'
                    : 'she is still getting to know you — how you answer, where you linger, when you show up. it gathers here as you learn.'}
                </div>
              ) : (
                <>
                  {/* the things she remembers — each one removable on its own */}
                  {knownItems.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <AnimatePresence initial={false}>
                        {knownItems.map((item) => (
                          <motion.span
                            key={`${item.kind}:${item.text}`}
                            layout
                            initial={{ opacity: 0, scale: 0.82 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.82 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 7,
                              padding: '6px 8px 6px 13px',
                              borderRadius: 999,
                              background: 'var(--clss-tonal)',
                              fontSize: '0.85rem',
                              color: 'var(--clss-ink-900)',
                            }}
                          >
                            {item.kind === 'interest' ? `into ${item.text}` : item.text}
                            <button
                              type="button"
                              aria-label={`forget ${item.text}`}
                              onClick={() => removeItem(item)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                color: 'var(--clss-ink-300)',
                                fontSize: '1.05rem',
                                lineHeight: 1,
                                padding: 0,
                                width: 18,
                                height: 18,
                                display: 'grid',
                                placeItems: 'center',
                              }}
                            >
                              ×
                            </button>
                          </motion.span>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                  {/* what she has inferred from watching — read-only, it regenerates as she learns */}
                  {observations.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {observations.map((line) => (
                        <div key={line} style={{ ...bodyLine, fontSize: '0.9rem' }}>
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              <Hairline style={{ margin: '6px 0' }} />
              <div style={{ ...whisper }}>
                this stays on your device and shapes how she helps you. remove any one, or clear it
                all — she will not mind.
              </div>
              {(knownItems.length > 0 || observations.length > 0) && (
                <div>
                  <MagneticButton size="sm" variant="quiet" onClick={forgetMind}>
                    clear everything she knows
                  </MagneticButton>
                </div>
              )}
            </Card>
          </Section>
        </motion.div>

        <Hairline />

        {/* ---- settings ---- */}
        <motion.div variants={rise}>
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
              <DialRow
                title="adventure roadmap"
                line="see each subject's chapters as a journey through biomes, not a list"
                on={adventure}
                onChange={(v) => {
                  setAdventure(v);
                  saveViewPref(v ? 'adventure' : 'list');
                }}
              />
              <Hairline />
              <ProactivityRow
                value={proactivity}
                onChange={(p) => {
                  setProactivity(p);
                  saveProactivity(p);
                }}
              />
              <Hairline />
              <AppearanceRow />
              <Hairline />
              {/* durable accessibility — larger text and high contrast apply for real and ride her
                  dossier so she honors them every turn */}
              <DialRow
                title="larger text"
                line="bump the type size across the whole app"
                on={Boolean(profile.largeText)}
                onChange={(v) => patchProfile({ largeText: v })}
              />
              <Hairline />
              <DialRow
                title="high contrast"
                line="stronger text and lines, easier to read"
                on={Boolean(profile.highContrast)}
                onChange={(v) => patchProfile({ highContrast: v })}
              />
              <Hairline />
              <div style={{ padding: '13px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: '0.95rem', color: 'var(--clss-ink-900)' }}>
                    the language I learn in
                  </div>
                  <div style={{ ...bodyLine, fontSize: '0.8rem', marginTop: 2 }}>
                    Vidya teaches and replies in this language until you change it — English by
                    default
                  </div>
                </div>
                <input
                  defaultValue={profile.language ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (profile.language ?? '')) patchProfile({ language: v || undefined });
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  placeholder="e.g. Hindi, Tamil, English"
                  aria-label="the language I learn in"
                  style={{
                    maxWidth: 340,
                    padding: '10px 14px',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    border: '0.5px solid var(--clss-hairline-on-paper-strong)',
                    borderRadius: 'var(--clss-radius-sm)',
                    outline: 'none',
                    background: 'var(--clss-paper)',
                    color: 'var(--clss-ink-900)',
                  }}
                />
              </div>
              <Hairline />
              {/* re-onboard door — walk the intro again, mastery intact */}
              <div style={{ padding: '13px 0' }}>
                <button
                  type="button"
                  onClick={redoSetup}
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
                    redo my setup
                  </div>
                  <div style={{ ...bodyLine, fontSize: '0.8rem', marginTop: 2 }}>
                    walk through the intro with Vidya again — your xp, streak, and mastery all stay
                  </div>
                </button>
              </div>
              {/* sign out — live mode only; the dev-mock learner has no session to end */}
              {!sdk.config.devAuth && (
                <>
                  <Hairline />
                  <div style={{ padding: '13px 0' }}>
                    <button
                      type="button"
                      onClick={signOut}
                      disabled={signingOut}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        fontFamily: 'inherit',
                        cursor: signingOut ? 'default' : 'pointer',
                        padding: 0,
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ fontSize: '0.95rem', color: 'var(--clss-ink-900)' }}>
                        {signingOut ? 'signing out…' : 'sign out'}
                      </div>
                      <div style={{ ...bodyLine, fontSize: '0.8rem', marginTop: 2 }}>
                        your page stays safe with your account — sign back in any time
                      </div>
                    </button>
                  </div>
                </>
              )}
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
                      this clears your name, photo, progress, and settings from this device. it
                      cannot be undone.
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
        </motion.div>
      </motion.div>
    </div>
  );
}
