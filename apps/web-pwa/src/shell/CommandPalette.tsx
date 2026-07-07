'use client';

/**
 * The command palette (DESIGN.md §6) — ⌘K reaches any surface, subject, chapter, topic, or action
 * in the product, and any miss falls through to Vidya. Frosted glass (FROST, ui/kit), sharp 3px
 * corners, hairline borders, a spring entrance and a staggered result cascade (MOTION.md §3).
 * Quiet chrome; one accent — the ultramarine spark that is Vidya herself.
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { chaptersBySubject, displaySubjects } from '../data/catalog';
import { useSdk } from '../store/sdk';
import { FROST, fluidType, Kbd, SectionLabel, surface } from '../ui/kit';
import { getThemePref, setThemePref } from '../ui/theme';
import { loadViewPref, saveViewPref } from '../ui/viewPref';
import { useVidyaChat } from '../vidya/chat';
import { isMuted, setMuted } from '../vidya/speech';
import { type Route, useRouter } from './router';

type Section = 'go' | 'subjects' | 'library' | 'actions';

interface Item {
  id: string;
  label: string;
  hint: string;
  section: Section;
  /** Extra searchable text (chapter, subject, synonyms) beyond the visible label. */
  search: string;
  run: () => void;
}

const SECTION_LABEL: Record<Section | 'recent', string> = {
  recent: 'recent',
  go: 'go to',
  subjects: 'subjects',
  library: 'chapters & topics',
  actions: 'actions',
};

/** Doors that anchor the empty state — the small visible set (DESIGN.md §6). */
const PRIMARY_DOORS = ['home', 'learn', 'practice', 'progress', 'you', 'chat'];

// ---- recents (localStorage, cap 6) ------------------------------------------------------------
const RECENT_KEY = 'clss-cmdk-recent-v1';
const RECENT_CAP = 6;

function loadRecents(): string[] {
  try {
    const a = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(a) ? (a as string[]).slice(0, RECENT_CAP) : [];
  } catch {
    return [];
  }
}

function pushRecent(id: string): void {
  try {
    const next = [id, ...loadRecents().filter((x) => x !== id)].slice(0, RECENT_CAP);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — recents live for this session only
  }
}

// ---- ranking: prefix > word-start > substring > fuzzy subsequence ------------------------------
/** Subsequence score, or -1 if `q` is not a subsequence of `text`. Rewards runs + word starts. */
function fuzzy(text: string, q: string): number {
  let ti = 0;
  let score = 0;
  let run = 0;
  for (const c of q) {
    let found = -1;
    for (let j = ti; j < text.length; j++)
      if (text[j] === c) {
        found = j;
        break;
      }
    if (found === -1) return -1;
    const boundary = found === 0 || /[^a-z0-9]/.test(text[found - 1] ?? '');
    run = found === ti ? run + 1 : 0;
    score += 1 + run * 2 + (boundary ? 3 : 0);
    ti = found + 1;
  }
  return score;
}

/** Higher is better; -Infinity means no match. Tiers keep prefix above word-start above fuzzy. */
function rank(item: Item, q: string): number {
  const label = item.label.toLowerCase();
  if (label === q) return 10000;
  if (label.startsWith(q)) return 4000 - label.length;
  if (label.split(/\s+/).some((w) => w.startsWith(q))) return 3000 - label.length;
  if (label.includes(q)) return 2000 - label.indexOf(q);
  const fl = fuzzy(label, q);
  if (fl >= 0) return 1000 + fl;
  if (item.search.includes(q)) return 500;
  const fs = fuzzy(item.search, q);
  if (fs >= 0) return fs;
  return Number.NEGATIVE_INFINITY;
}

export function CommandPalette() {
  const router = useRouter();
  const chat = useVidyaChat();
  const sdk = useSdk();
  const reduced = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const close = () => setOpen(false);

  // The corpus is rebuilt on each open so the doors follow the live profile (board + grade) and the
  // action labels reflect the current theme / mute / view state. router, sdk are stable refs.
  // biome-ignore lint/correctness/useExhaustiveDependencies: open IS the trigger — re-read profile, theme, mute, and view from storage on each open
  const corpus = useMemo<Item[]>(() => {
    const goto = (route: Route) => () => router.navigate(route);
    const items: Item[] = [
      { id: 'home', label: 'Home', hint: 'The front door', section: 'go', route: { name: 'home' } },
      { id: 'chat', label: 'Chat', hint: 'Talk to Vidya', section: 'go', route: { name: 'chat' } },
      {
        id: 'learn',
        label: 'Learn',
        hint: 'Your subjects',
        section: 'go',
        route: { name: 'learn' },
      },
      {
        id: 'practice',
        label: 'Practice',
        hint: 'Sandbox & retrieval',
        section: 'go',
        route: { name: 'practice' },
      },
      {
        id: 'progress',
        label: 'Progress',
        hint: 'Your knowledge twin',
        section: 'go',
        route: { name: 'progress' },
      },
      {
        id: 'you',
        label: 'You',
        hint: 'Profile & settings',
        section: 'go',
        route: { name: 'you' },
      },
      {
        id: 'concept-a',
        label: 'Concept A',
        hint: 'Stage & rail',
        section: 'go',
        route: { name: 'concept', which: 'a' },
      },
      {
        id: 'concept-b',
        label: 'Concept B',
        hint: 'The thread',
        section: 'go',
        route: { name: 'concept', which: 'b' },
      },
      {
        id: 'concept-c',
        label: 'Concept C',
        hint: 'The broadsheet',
        section: 'go',
        route: { name: 'concept', which: 'c' },
      },
    ].map((c) => ({
      id: c.id,
      label: c.label,
      hint: c.hint,
      section: c.section as Section,
      search: `${c.label} ${c.hint}`.toLowerCase(),
      run: goto(c.route as Route),
    }));

    // the board's doors, not the canonical six — CBSE ≤10 clubs the sciences into one "Science"
    for (const s of displaySubjects())
      items.push({
        id: `subj-${s.id}`,
        label: s.name,
        hint: 'Subject',
        section: 'subjects',
        search: `${s.name} ${s.line}`.toLowerCase(),
        run: goto({ name: 'subject', subjectId: s.id, intent: 'learn' }),
      });

    for (const chapters of Object.values(chaptersBySubject))
      for (const ch of chapters) {
        items.push({
          id: `chap-${ch.id}`,
          label: ch.name,
          hint: 'Chapter',
          section: 'library',
          search: ch.name.toLowerCase(),
          run: goto({ name: 'subject', subjectId: ch.subjectId, intent: 'learn' }),
        });
        for (const topic of ch.topics)
          items.push({
            id: `topic-${topic.id}`,
            label: topic.name,
            hint: ch.name,
            section: 'library',
            search: `${topic.name} ${ch.name} ${topic.blurb}`.toLowerCase(),
            run: goto({ name: 'course', topicId: topic.id }),
          });
      }

    // Actions — real product state, flipped in place (label reflects the current state).
    const isDark =
      typeof document !== 'undefined'
        ? document.documentElement.dataset.theme === 'dark'
        : getThemePref() === 'dark';
    const muted = isMuted();
    const adventure = loadViewPref() === 'adventure';
    items.push(
      {
        id: 'act-theme',
        label: isDark ? 'Switch to light' : 'Switch to dark',
        hint: 'Appearance',
        section: 'actions',
        search: 'theme appearance light dark mode',
        run: () => setThemePref(isDark ? 'light' : 'dark'),
      },
      {
        id: 'act-mute',
        label: muted ? "Unmute Vidya's voice" : "Mute Vidya's voice",
        hint: 'Sound',
        section: 'actions',
        search: 'mute unmute sound voice audio',
        run: () => setMuted(!muted),
      },
      {
        id: 'act-view',
        label: adventure ? 'Switch to list view' : 'Switch to adventure view',
        hint: 'Subjects view',
        section: 'actions',
        search: 'view list adventure roadmap map layout',
        run: () => saveViewPref(adventure ? 'list' : 'adventure'),
      },
    );

    const account = sdk.account;
    if (account?.isAuthenticated())
      items.push({
        id: 'act-signout',
        label: 'Sign out',
        hint: 'Account',
        section: 'actions',
        search: 'sign out log out account',
        run: () => void account.signOut().finally(() => window.location.assign('/')),
      });
    else if (account)
      items.push({
        id: 'act-signin',
        label: 'Sign in with Google',
        hint: 'Account',
        section: 'actions',
        search: 'sign in log in google account',
        run: () => void account.signInWithGoogle(window.location.origin),
      });

    return items;
  }, [open, router, sdk]);

  const byId = useMemo(() => new Map(corpus.map((i) => [i.id, i])), [corpus]);

  // Rows to render: recents + doors when idle; ranked, section-grouped clusters when searching.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      const recents = loadRecents()
        .map((id) => byId.get(id))
        .filter((i): i is Item => Boolean(i));
      const recentIds = new Set(recents.map((i) => i.id));
      const doors = PRIMARY_DOORS.map((id) => byId.get(id)).filter(
        (i): i is Item => i != null && !recentIds.has(i.id),
      );
      const out: { label: string; items: Item[] }[] = [];
      if (recents.length) out.push({ label: SECTION_LABEL.recent, items: recents });
      if (doors.length) out.push({ label: SECTION_LABEL.go, items: doors });
      return out;
    }
    // Rank within each section, drop empties, order sections by their best hit (best cluster first).
    const sections: Section[] = ['go', 'subjects', 'library', 'actions'];
    return sections
      .map((sec) => {
        const scored = corpus
          .filter((i) => i.section === sec)
          .map((i) => ({ i, s: rank(i, q) }))
          .filter((x) => x.s > Number.NEGATIVE_INFINITY)
          .sort((a, b) => b.s - a.s);
        return {
          label: SECTION_LABEL[sec],
          items: scored.slice(0, 6).map((x) => x.i),
          top: scored[0]?.s ?? Number.NEGATIVE_INFINITY,
        };
      })
      .filter((g) => g.items.length)
      .sort((a, b) => b.top - a.top);
  }, [query, corpus, byId]);

  const hasQuery = query.trim().length > 0;
  // The flat navigable list, in visual order — the ask-Vidya row is always the last stop.
  const navItems = useMemo(() => {
    const flat = groups.flatMap((g) => g.items);
    return hasQuery ? [...flat, { id: '__ask__' } as { id: string }] : flat;
  }, [groups, hasQuery]);
  const noMatches = hasQuery && groups.length === 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery('');
        setIndex(0);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  // Keep the active option in view as arrows walk the list.
  // biome-ignore lint/correctness/useExhaustiveDependencies: index IS the trigger — re-scroll the newly active row
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  const runAt = (i: number) => {
    const it = navItems[i];
    if (!it) return;
    if (it.id === '__ask__') {
      const q = query.trim();
      setOpen(false);
      router.navigate({ name: 'chat' });
      void chat.ask(q);
      return;
    }
    const item = byId.get(it.id);
    if (!item) return;
    pushRecent(item.id);
    setOpen(false);
    item.run();
  };

  const activeId = navItems[index] ? `cmdk-opt-${navItems[index].id}` : undefined;

  // Motion — spring entrance + staggered cascade; reduced-motion collapses to a plain crossfade.
  const panelMotion = reduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { opacity: 0, y: 8, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 8, scale: 0.98 },
        transition: { type: 'spring' as const, stiffness: 300, damping: 28 },
      };
  const listV = reduced
    ? undefined
    : { hidden: {}, show: { transition: { staggerChildren: 0.03, delayChildren: 0.02 } } };
  const rowV = reduced
    ? undefined
    : {
        hidden: { opacity: 0, y: 8 },
        show: {
          opacity: 1,
          y: 0,
          transition: { type: 'spring' as const, stiffness: 500, damping: 32 },
        },
      };

  const row = (item: Item, navIndex: number) => {
    const active = navIndex === index;
    return (
      <motion.button
        key={item.id}
        id={`cmdk-opt-${item.id}`}
        type="button"
        role="option"
        aria-selected={active}
        data-active={active}
        variants={rowV}
        onClick={() => runAt(navIndex)}
        onMouseMove={() => index !== navIndex && setIndex(navIndex)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 16,
          width: '100%',
          padding: '9px 12px',
          border: 'none',
          borderRadius: 3,
          background: active ? surface.tonal : 'transparent',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
          transition: 'background 0.12s ease',
        }}
      >
        <span
          style={{
            fontSize: fluidType.body,
            color: surface.ink,
            fontWeight: active ? 550 : 450,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.label}
        </span>
        <span
          style={{
            fontSize: fluidType.small,
            color: surface.inkFaint,
            whiteSpace: 'nowrap',
            flex: 'none',
          }}
        >
          {item.hint}
        </span>
      </motion.button>
    );
  };

  let navCursor = 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 'var(--clss-z-modal)' as unknown as number,
            // A neutral near-black scrim dims in BOTH themes (theme ink would lighten dark mode).
            background: 'rgba(10,11,14,0.34)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingTop: '17vh',
            paddingLeft: 24,
            paddingRight: 24,
          }}
        >
          <motion.div
            {...panelMotion}
            onClick={(e) => e.stopPropagation()}
            role="combobox"
            aria-expanded
            aria-haspopup="listbox"
            aria-controls="cmdk-list"
            aria-activedescendant={activeId}
            style={{
              ...FROST,
              width: 'min(600px, 100%)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIndex(0);
              }}
              onKeyDown={(e) => {
                const n = navItems.length;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (n) setIndex((i) => (i + 1) % n);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (n) setIndex((i) => (i - 1 + n) % n);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  runAt(index);
                }
              }}
              placeholder="Where to, or what…"
              aria-label="Search surfaces, subjects, and actions, or ask Vidya"
              autoComplete="off"
              spellCheck={false}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '16px 20px',
                fontSize: fluidType.body,
                fontFamily: 'inherit',
                border: 'none',
                borderBottom: '0.5px solid var(--clss-hairline-on-paper)',
                outline: 'none',
                background: 'transparent',
                color: surface.ink,
              }}
            />

            <motion.div
              ref={listRef}
              id="cmdk-list"
              role="listbox"
              aria-label="results"
              variants={listV}
              initial={reduced ? undefined : 'hidden'}
              animate={reduced ? undefined : 'show'}
              key={hasQuery ? 'q' : 'idle'}
              style={{ padding: 8, maxHeight: '46vh', overflowY: 'auto' }}
            >
              {groups.map((g) => (
                <div key={g.label}>
                  <SectionLabel
                    style={{
                      fontSize: fluidType.eyebrow,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      padding: '8px 12px 4px',
                    }}
                  >
                    {g.label}
                  </SectionLabel>
                  {g.items.map((item) => row(item, navCursor++))}
                </div>
              ))}

              {noMatches && (
                <div
                  style={{
                    padding: '12px 14px 4px',
                    fontSize: fluidType.small,
                    color: surface.inkFaint,
                  }}
                >
                  Nothing here yet — try “algebra”, or just ask me
                </div>
              )}

              {hasQuery &&
                (() => {
                  const askIndex = navItems.length - 1;
                  const active = index === askIndex;
                  return (
                    <motion.button
                      id="cmdk-opt-__ask__"
                      type="button"
                      role="option"
                      aria-selected={active}
                      data-active={active}
                      variants={rowV}
                      onClick={() => runAt(askIndex)}
                      onMouseMove={() => index !== askIndex && setIndex(askIndex)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        marginTop: groups.length ? 4 : 0,
                        padding: '11px 12px',
                        border: 'none',
                        borderTop: groups.length
                          ? '0.5px solid var(--clss-hairline-on-paper)'
                          : 'none',
                        borderRadius: 3,
                        background: active ? surface.tonal : 'transparent',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        textAlign: 'left',
                        transition: 'background 0.12s ease',
                      }}
                    >
                      {/* the one accent — the ultramarine spark that is Vidya */}
                      <span
                        aria-hidden
                        style={{
                          width: 7,
                          height: 7,
                          flex: 'none',
                          borderRadius: 9999,
                          background: 'var(--clss-ultramarine)',
                          boxShadow: '0 0 8px var(--clss-ultramarine)',
                        }}
                      />
                      <span
                        style={{ fontSize: fluidType.body, color: surface.ink, fontWeight: 450 }}
                      >
                        Ask Vidya
                      </span>
                      <span
                        style={{
                          fontSize: fluidType.body,
                          color: surface.inkSoft,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        “{query.trim()}”
                      </span>
                    </motion.button>
                  );
                })()}
            </motion.div>

            {/* quiet keyboard-hint footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '8px 14px',
                borderTop: '0.5px solid var(--clss-hairline-on-paper)',
                fontSize: fluidType.eyebrow,
                color: surface.inkFaint,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
                Navigate
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Kbd>↵</Kbd>
                Open
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Kbd>esc</Kbd>
                Close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
