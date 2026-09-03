import { describe, expect, it } from 'bun:test';
import { DB_PROXY_PREFIX, proxyEnabled, resolveSupabaseUrl } from '../src/config/supabaseUrl';

const PROJECT = 'https://keepraxqagzgjrrweryt.supabase.co';
const APP = 'https://heywobo.com';

/** Exactly how the SDK composes a path onto the base (packages/sdk/src/{identity,supabase}.ts). */
const auth = (base: string) => `${base}/auth/v1/token?grant_type=refresh_token`;
const rest = (base: string) => `${base}/rest/v1/learner_state?subject_id=eq.abc`;

describe('the database URL the browser is handed', () => {
  it('is the project URL when the proxy is off', () => {
    expect(resolveSupabaseUrl({ projectUrl: PROJECT, appUrl: APP })).toBe(PROJECT);
    expect(proxyEnabled({ proxy: undefined })).toBe(false);
  });

  it('is our own origin plus /db when the proxy is on', () => {
    expect(resolveSupabaseUrl({ projectUrl: PROJECT, proxy: '1', appUrl: APP })).toBe(
      'https://heywobo.com/db',
    );
  });

  it('never leaves the database host in the built URL once proxied', () => {
    const base = resolveSupabaseUrl({ projectUrl: PROJECT, proxy: '1', appUrl: APP }) as string;
    expect(auth(base)).not.toContain('supabase.co');
    expect(rest(base)).not.toContain('supabase.co');
  });

  it('keeps auth and PostgREST reachable through the rewrite', () => {
    // The rewrite is `/db/:path*` → `<project>/:path*`, so stripping the prefix has to land on
    // exactly the path Supabase serves. This is the unit-level proof that both planes survive it.
    const base = resolveSupabaseUrl({ proxy: '1', appUrl: APP }) as string;
    for (const url of [auth(base), rest(base)]) {
      const u = new URL(url);
      expect(u.origin).toBe(APP);
      expect(u.pathname.startsWith(`${DB_PROXY_PREFIX}/`)).toBe(true);
      const forwarded = new URL(`${PROJECT}${u.pathname.slice(DB_PROXY_PREFIX.length)}${u.search}`);
      expect(forwarded.origin).toBe(PROJECT);
      expect(forwarded.pathname).toMatch(/^\/(auth|rest)\/v1\//);
      // the query string a rewrite forwards untouched
      expect(forwarded.search).toBe(u.search);
    }
  });

  it('falls back to a same-origin relative base when no canonical origin is configured', () => {
    // A preview deployment and localhost both proxy to themselves; the canonical origin would
    // send their requests to production.
    expect(resolveSupabaseUrl({ proxy: '1' })).toBe('/db');
    expect(resolveSupabaseUrl({ proxy: '1', appUrl: '' })).toBe('/db');
  });

  it('tolerates a trailing slash on either configured URL', () => {
    expect(resolveSupabaseUrl({ projectUrl: `${PROJECT}/` })).toBe(PROJECT);
    expect(resolveSupabaseUrl({ proxy: '1', appUrl: `${APP}//` })).toBe('https://heywobo.com/db');
  });

  it('stays undefined in a keyless build, so mock mode still boots', () => {
    expect(resolveSupabaseUrl({})).toBeUndefined();
    expect(resolveSupabaseUrl({ projectUrl: '' })).toBeUndefined();
  });

  it('treats only the exact flag value as on', () => {
    for (const proxy of ['0', 'true', '', 'yes', undefined]) {
      expect(proxyEnabled({ proxy })).toBe(false);
    }
    expect(proxyEnabled({ proxy: '1' })).toBe(true);
  });
});
