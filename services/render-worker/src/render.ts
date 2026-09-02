/**
 * render.ts — the CLI. `node src/render.ts --artifact <path> [--out <path>] [--force]`
 *
 * Reads a cached scene-plan artifact, builds a beat-synced RenderPlan, and renders it to MP4 with
 * Remotion. Reuse economy: the canonical render lives beside the artifact named by scene-spec hash;
 * if it already exists we reuse it (unless --force). Retention law: renders are never overwritten —
 * a changed spec gets a new hash (a new suffix), so every version survives forever. A --out copy is
 * written when requested. A render-manifest.json {sceneSpecHash, model, renderedAt, …} sits beside
 * each render.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { ensureBrowser, renderMedia, selectComposition } from '@remotion/renderer';
import type { ExplainerProps } from './Explainer.tsx';
import { buildPlan } from './plan.ts';

const PKG_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const PUBLIC_DIR = join(PKG_DIR, 'public');

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const hasFlag = (name: string): boolean => process.argv.includes(`--${name}`);

function extFromMime(mime: string): string {
  const sub = (mime.split('/')[1] ?? 'wav').split(';')[0]?.trim() || 'wav';
  return sub === 'mpeg' ? 'mp3' : sub;
}

/** Decode a base64 audio blob to a stable file under public/, reused across renders by content. */
function writeAsset(dir: string, name: string, mime: string, b64: string): string {
  const rel = join('assets', dir, `${name}.${extFromMime(mime)}`);
  const abs = join(PUBLIC_DIR, rel);
  mkdirSync(dirname(abs), { recursive: true });
  if (!existsSync(abs)) writeFileSync(abs, Buffer.from(b64, 'base64'));
  return rel;
}

async function main(): Promise<void> {
  const artifactPath = arg('artifact');
  if (!artifactPath) throw new Error('usage: render --artifact <path> [--out <path>] [--force]');
  const outArg = arg('out');
  const force = hasFlag('force');

  const raw: unknown = JSON.parse(readFileSync(artifactPath, 'utf8'));
  const plan = buildPlan(raw);

  const artifactDir = dirname(artifactPath);
  const base = basename(artifactPath, extname(artifactPath));
  const cacheOut = join(artifactDir, `${base}.${plan.sceneSpecHash}.mp4`);
  const manifestOut = join(artifactDir, `${base}.${plan.sceneSpecHash}.render-manifest.json`);

  console.log(
    `[render] ${base}  scenes=${plan.scenes.length}  frames=${plan.totalFrames}  ` +
      `dur=${(plan.totalMs / 1000).toFixed(3)}s  hash=${plan.sceneSpecHash}`,
  );

  if (existsSync(cacheOut) && !force) {
    console.log(`[render] reuse (spec unchanged): ${cacheOut}`);
    if (outArg && outArg !== cacheOut) writeFileSync(outArg, readFileSync(cacheOut));
    return;
  }

  // Decode audio blobs to files under public/ so staticFile() can serve them to the render.
  const assetDir = plan.sceneSpecHash;
  const scenes: ExplainerProps['scenes'] = plan.scenes.map((s) => ({
    id: s.id,
    svg: s.svg,
    frames: s.frames,
    audioFile: s.audio ? writeAsset(assetDir, `${s.id}-vo`, s.audio.mime, s.audio.b64) : null,
    sfx: s.sfx.map((cue, j) => ({
      file: writeAsset(assetDir, `${s.id}-sfx${j}`, cue.mime, cue.b64),
      fromFrame: Math.round((cue.atMs / 1000) * plan.fps),
    })),
  }));
  const inputProps: ExplainerProps = {
    scenes,
    bedFile: plan.bed ? writeAsset(assetDir, 'bed', plan.bed.mime, plan.bed.b64) : null,
    bgmFile: plan.bgm ? writeAsset(assetDir, 'bgm', plan.bgm.mime, plan.bgm.b64) : null,
    bgmGain: plan.bgm?.gain ?? 0.14,
  };

  console.log('[render] ensuring headless browser…');
  await ensureBrowser();
  console.log('[render] bundling composition…');
  const serveUrl = await bundle({
    entryPoint: join(PKG_DIR, 'src', 'Root.tsx'),
    publicDir: PUBLIC_DIR,
  });
  const composition = await selectComposition({ serveUrl, id: 'Explainer', inputProps });
  console.log(`[render] rendering ${composition.durationInFrames} frames → ${cacheOut}`);

  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: cacheOut,
    inputProps,
    onProgress: ({ progress }) =>
      process.stdout.write(`\r[render] ${Math.round(progress * 100)}%   `),
  });
  process.stdout.write('\n');

  const manifest = {
    sceneSpecHash: plan.sceneSpecHash,
    model: plan.model,
    renderedAt: new Date().toISOString(),
    artifact: basename(artifactPath),
    fps: plan.fps,
    width: plan.width,
    height: plan.height,
    durationInFrames: composition.durationInFrames,
    durationMs: plan.totalMs,
    scenes: plan.scenes.map((s) => ({ id: s.id, beatMs: s.beatMs, frames: s.frames })),
    renderer: 'remotion',
    output: basename(cacheOut),
    outputSha256: createHash('sha256').update(readFileSync(cacheOut)).digest('hex'),
  };
  writeFileSync(manifestOut, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`[render] manifest → ${manifestOut}`);

  if (outArg && outArg !== cacheOut) {
    writeFileSync(outArg, readFileSync(cacheOut));
    console.log(`[render] copy → ${outArg}`);
  }
}

main().catch((err) => {
  console.error('[render] failed:', err);
  process.exit(1);
});
