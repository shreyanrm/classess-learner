'use client';

/** Placeholder — being built to full depth by the rebuild fleet. */

import { useRouter } from '../shell/router';

export function ProgressScreen() {
  const router = useRouter();
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ color: 'var(--clss-ink-900)', fontSize: '1.2rem', fontWeight: 500 }}>ProgressScreen</div>
      <button type="button" onClick={() => router.navigate({ name: 'home' })} style={{ border: '0.5px solid var(--clss-hairline-on-paper-strong)', background: 'var(--clss-paper)', borderRadius: 'var(--clss-radius-sm)', padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>home</button>
    </div>
  );
}
