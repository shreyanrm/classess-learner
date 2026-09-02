'use client';

/**
 * GeneratedImage — renders an engine.image result (Gemini imagery for what SVG cannot express,
 * DESIGN.md §9) with a graceful pending state: the frame is present and calm from the first
 * paint, the image fades in when it lands, and a refusal stays quiet — never an error state.
 */

import { useRegisterTarget } from '@classess/wobo';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { whisper } from '../screens/course/shared';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Extracts a renderable src from an engine.image output. Null when nothing safe is present. */
export function imageSrcFrom(raw: unknown): string | null {
  if (!isRecord(raw)) return null;
  const out = isRecord(raw.image) ? raw.image : raw;
  const direct = [out.src, out.url, out.data_uri, out.dataUri].find(
    (v): v is string => typeof v === 'string',
  );
  if (direct && /^(https?:\/\/|data:image\/)/.test(direct)) return direct;
  const base64 = [out.image_base64, out.base64, out.b64].find(
    (v): v is string => typeof v === 'string',
  );
  if (base64) {
    const mime = typeof out.mime_type === 'string' ? out.mime_type : 'image/png';
    return mime.startsWith('image/') ? `data:${mime};base64,${base64}` : null;
  }
  return null;
}

export function GeneratedImage({
  id,
  src,
  alt,
  aspect = '16 / 10',
  caption,
}: {
  id: string;
  /** Absent while the image is still being composed — the frame waits gracefully. */
  src?: string | null;
  alt: string;
  aspect?: string;
  caption?: string;
}) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const ref = useRegisterTarget<HTMLDivElement>(`image-${id}`, { kind: 'image', label: alt });

  // a new src restarts the load cycle (state derived during render — no effect needed)
  const [lastSrc, setLastSrc] = useState(src);
  if (src !== lastSrc) {
    setLastSrc(src);
    setState('loading');
  }

  const showImage = Boolean(src) && state !== 'failed';
  const settledWaiting = !src || state !== 'ready';

  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        ref={ref}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: aspect,
          border: '0.5px solid var(--clss-hairline-on-paper)',
          borderRadius: 'var(--clss-radius-md)',
          background: 'var(--clss-canvas)',
          overflow: 'hidden',
        }}
      >
        {showImage && src && (
          <motion.img
            src={src}
            alt={alt}
            initial={{ opacity: 0 }}
            animate={{ opacity: state === 'ready' ? 1 : 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
            onLoad={() => setState('ready')}
            onError={() => setState('failed')}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
        {settledWaiting && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            {state === 'failed' ? (
              <span style={whisper}>This image is being remade</span>
            ) : (
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                style={whisper}
              >
                {src ? 'the image is arriving' : 'the image is being composed'}
              </motion.span>
            )}
          </div>
        )}
      </div>
      {caption && <figcaption style={{ ...whisper, textAlign: 'center' }}>{caption}</figcaption>}
    </figure>
  );
}
