'use client';

/**
 * The command palette (DESIGN.md §6) — Cmd-K reaches any action in the product. Frost overlay,
 * one input, arrow keys, enter. Quiet chrome; no pigment.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { chaptersBySubject, subjects } from '../data/catalog';
import { type Route, useRouter } from './router';

interface Command {
  id: string;
  label: string;
  hint: string;
  route: Route;
}

function buildCommands(): Command[] {
  const cmds: Command[] = [
    { id: 'home', label: 'home', hint: 'the front door', route: { name: 'home' } },
    { id: 'learn', label: 'learn', hint: 'your subjects', route: { name: 'learn' } },
    { id: 'practice', label: 'practice', hint: 'sandbox and retrieval', route: { name: 'practice' } },
    { id: 'progress', label: 'progress', hint: 'your knowledge twin', route: { name: 'progress' } },
    { id: 'you', label: 'you', hint: 'profile, settings, past courses', route: { name: 'you' } },
  ];
  for (const s of subjects)
    cmds.push({ id: `subj-${s.id}`, label: s.name.toLowerCase(), hint: 'subject', route: { name: 'subject', subjectId: s.id, intent: 'learn' } });
  for (const chapters of Object.values(chaptersBySubject))
    for (const ch of chapters)
      for (const topic of ch.topics)
        cmds.push({ id: `topic-${topic.id}`, label: topic.name.toLowerCase(), hint: ch.name.toLowerCase(), route: { name: 'course', topicId: topic.id } });
  return cmds;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const all = useMemo(buildCommands, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q ? all.filter((c) => c.label.includes(q) || c.hint.includes(q)) : all;
    return pool.slice(0, 8);
  }, [query, all]);

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

  const run = (cmd: Command | undefined) => {
    if (!cmd) return;
    setOpen(false);
    router.navigate(cmd.route);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 'var(--clss-z-modal)' as unknown as number,
            background: 'rgba(13,13,16,0.28)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingTop: '18vh',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(560px, calc(100vw - 48px))',
              background: 'var(--clss-frost-on-paper)',
              backdropFilter: 'blur(var(--clss-frost-blur))',
              WebkitBackdropFilter: 'blur(var(--clss-frost-blur))',
              border: '0.5px solid var(--clss-hairline-on-paper-strong)',
              borderRadius: 'var(--clss-radius-panel)',
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
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setIndex((i) => Math.min(i + 1, matches.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setIndex((i) => Math.max(i - 1, 0));
                } else if (e.key === 'Enter') {
                  run(matches[index]);
                }
              }}
              placeholder="where to, or what…"
              style={{
                width: '100%',
                padding: '16px 20px',
                fontSize: '1.05rem',
                fontFamily: 'inherit',
                border: 'none',
                borderBottom: '0.5px solid var(--clss-hairline-on-paper)',
                outline: 'none',
                background: 'transparent',
                color: 'var(--clss-ink-900)',
              }}
            />
            <div style={{ padding: 8, maxHeight: 320, overflowY: 'auto' }}>
              {matches.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => run(c)}
                  onMouseEnter={() => setIndex(i)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    width: '100%',
                    padding: '10px 14px',
                    border: 'none',
                    borderRadius: 'var(--clss-radius-sm)',
                    background: i === index ? 'var(--clss-ink-100)' : 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '0.95rem', color: 'var(--clss-ink-900)' }}>{c.label}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--clss-ink-500)' }}>{c.hint}</span>
                </button>
              ))}
              {matches.length === 0 && (
                <div style={{ padding: '14px 16px', color: 'var(--clss-ink-500)', fontSize: '0.9rem' }}>
                  nothing by that name — ask Vidya instead
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
