'use client';

/**
 * Click ink — a quiet expanding hairline ring wherever the pointer presses. Tactile confirmation
 * that the tap landed (DESIGN.md §5: micro-interaction character, meaning not decoration).
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Ink {
  id: number;
  x: number;
  y: number;
}

let inkSeq = 1;

export function ClickInk() {
  const [inks, setInks] = useState<Ink[]>([]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const id = inkSeq++;
      setInks((prev) => [...prev.slice(-4), { id, x: e.clientX, y: e.clientY }]);
      setTimeout(() => setInks((prev) => prev.filter((i) => i.id !== id)), 480);
    };
    window.addEventListener('pointerdown', onDown, { passive: true });
    return () => window.removeEventListener('pointerdown', onDown);
  }, []);

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 'var(--clss-z-toast)' as unknown as number }}>
      <AnimatePresence>
        {inks.map((ink) => (
          <motion.span
            key={ink.id}
            initial={{ opacity: 0.45, scale: 0.3 }}
            animate={{ opacity: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0, 0, 0.2, 1] }}
            style={{
              position: 'absolute',
              left: ink.x - 14,
              top: ink.y - 14,
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '1px solid var(--clss-ink-500)',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
