/**
 * Export (docs/BOARD.md §9) — the proof loop. A board leaves as a shareable image with the
 * wordmark on it, and as objects (never pixels) when it is saved to notes.
 *
 * The image is rasterised from the live SVG, so what is exported is exactly what was drawn: the
 * same strokes, the same ink tokens resolved to the theme the learner was looking at.
 */

import type { BoardStore } from './store';
import { serializeBoard } from './store';

/** The paper an exported board sits on, per theme. Tokens, resolved at export time. */
export interface ExportTheme {
  background: string;
  ink: string;
}

export const LIGHT_EXPORT: ExportTheme = { background: '#FFFFFF', ink: '#0D0D10' };
export const DARK_EXPORT: ExportTheme = { background: '#17181C', ink: '#F2F2F5' };

export interface ExportOptions {
  /** Pixel scale. 2 is a crisp share on a phone. */
  scale?: number;
  theme?: ExportTheme;
  /** The wordmark drawn in the corner. */
  wordmark?: string;
  /** A caption under the wordmark — a topic, a date. */
  caption?: string;
}

/**
 * Wrap the live SVG markup in a standalone document: an explicit size, the paper behind it, and
 * the CSS custom properties the ink resolves through — an exported board must not depend on the
 * page it came from.
 */
export function standaloneSvg(
  inner: string,
  size: { width: number; height: number },
  theme: ExportTheme,
): string {
  const style = `<style>svg{--wobo-ink:${theme.ink};--wobo-accent:#1F35E0;--wobo-learner:${theme.ink};--wobo-faint:${theme.ink};}</style>`;
  const body = inner
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim();
  const viewBox = inner.match(/viewBox="([^"]*)"/)?.[1] ?? `0 0 ${size.width} ${size.height}`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="${viewBox}">`,
    style,
    `<rect x="-100000" y="-100000" width="200000" height="200000" fill="${theme.background}"/>`,
    body,
    '</svg>',
  ].join('');
}

/** Where the wordmark sits: bottom right, inside the board's own breathing room. */
export function wordmarkPlacement(
  width: number,
  height: number,
): { x: number; y: number; size: number } {
  const size = Math.max(14, Math.round(Math.min(width, height) * 0.032));
  return { x: width - size, y: height - size, size };
}

/**
 * Rasterise a board to a PNG blob with the wordmark on it. Returns null wherever the platform
 * cannot do it (no canvas, a tainted image, an SVG that will not decode) — a share that cannot be
 * made is simply not offered, never a broken file.
 */
export async function exportBoardPng(
  svg: SVGSVGElement,
  opts: ExportOptions = {},
): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const scale = opts.scale ?? 2;
  const theme = opts.theme ?? LIGHT_EXPORT;
  const rect = svg.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  try {
    const markup = standaloneSvg(
      new XMLSerializer().serializeToString(svg),
      { width, height },
      theme,
    );
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('svg did not decode'));
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.scale(scale, scale);
      ctx.fillStyle = theme.background;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);

      const mark = wordmarkPlacement(width, height);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = theme.ink;
      ctx.font = `600 ${mark.size}px 'Google Sans Flex', system-ui, sans-serif`;
      ctx.fillText(opts.wordmark ?? 'wobo', mark.x, mark.y);
      if (opts.caption) {
        ctx.globalAlpha = 0.35;
        ctx.font = `400 ${Math.round(mark.size * 0.62)}px 'Google Sans Flex', system-ui, sans-serif`;
        ctx.fillText(opts.caption, mark.x, mark.y + mark.size * 0.95);
      }
      ctx.globalAlpha = 1;

      return await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
}

/** A calm, sentence-case file name — no emoji, no exclamation marks. */
export function boardFileName(title?: string): string {
  const slug = (title ?? 'board')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `${slug || 'board'}.png`;
}

/** "Save to notes": the board as objects, never pixels (BOARD.md §9). */
export function saveBoard(
  store: BoardStore,
  title?: string,
): {
  title: string;
  savedAt: string;
  objects: ReturnType<typeof serializeBoard>['objects'];
} {
  return {
    title: title ?? 'board',
    savedAt: new Date().toISOString(),
    objects: serializeBoard(store).objects,
  };
}
