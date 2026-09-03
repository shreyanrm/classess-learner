/**
 * Where the browser talks to the database.
 *
 * Two shapes, one builder. Direct: the Supabase project URL, and every learner's network tab
 * names our database host. Proxied: our OWN origin plus `/db`, which a Vercel rewrite forwards
 * to the project (see the `/db/:path*` rewrite in the root `vercel.json`). The proxied shape is
 * why the CSP no longer has to allow `*.supabase.co` at all — the request never leaves our
 * origin as far as the browser is concerned.
 *
 * The SDK composes paths onto whatever this returns — `${base}/auth/v1/token`,
 * `${base}/rest/v1/learner_state` — so a base that keeps those two suffixes intact is the whole
 * contract, and it is what the tests pin.
 */

export interface SupabaseUrlEnv {
  /** `VITE_SUPABASE_URL` — the project URL. Required for the direct shape. */
  projectUrl?: string;
  /** `VITE_SUPABASE_PROXY` — `'1'` routes through our own origin. */
  proxy?: string;
  /** `VITE_APP_URL` — the canonical origin. Absent ⇒ a same-origin relative base. */
  appUrl?: string;
}

/** The path prefix the Vercel rewrite listens on. One constant, so config and code cannot drift. */
export const DB_PROXY_PREFIX = '/db';

const trimEnd = (value: string): string => value.replace(/\/+$/, '');

/** Is the database proxy switched on? Only the exact string `'1'` counts — no truthy accidents. */
export function proxyEnabled(env: SupabaseUrlEnv): boolean {
  return env.proxy === '1';
}

/**
 * The base URL the SDK should use, or `undefined` when the app is keyless (mock/local mode, which
 * must keep working with no Supabase config at all).
 *
 * With the proxy on and a canonical origin configured the base is absolute
 * (`https://heywobo.com/db`); with the proxy on and no origin it is the relative `/db`, which is
 * correct on a preview deployment and on localhost, where the canonical origin would be wrong.
 */
export function resolveSupabaseUrl(env: SupabaseUrlEnv): string | undefined {
  if (proxyEnabled(env)) {
    const origin = trimEnd(env.appUrl ?? '');
    return `${origin}${DB_PROXY_PREFIX}`;
  }
  const direct = trimEnd(env.projectUrl ?? '');
  return direct || undefined;
}
