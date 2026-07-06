/**
 * A minimal PostgREST client for the `learner` schema. The SDK needs exactly three verbs — rpc,
 * select-one, upsert — against RLS-guarded tables, so plain fetch does it; the anon key is
 * client-safe and the access token (dev JWT today, the real session at Phase 4) carries auth.uid().
 * ponytail: no @supabase/supabase-js — auth landed on plain fetch too (identity.ts); add the SDK
 * when realtime lands.
 */

export interface SupabaseRestConfig {
  url: string;
  /** The publishable/anon key (client-safe, from env — never hardcoded). */
  anonKey: string;
  /**
   * JWT whose sub = subject_id; RLS keys every row to it. A getter keeps live-auth tokens fresh
   * across refreshes. Absent/undefined => anon role (reads only fail closed).
   */
  accessToken?: string | (() => string | undefined);
}

export class SupabaseRest {
  constructor(private readonly cfg: SupabaseRestConfig) {}

  private token(): string | undefined {
    const t = this.cfg.accessToken;
    return typeof t === 'function' ? t() : t;
  }

  private headers(profileHeader: 'accept-profile' | 'content-profile'): Record<string, string> {
    return {
      apikey: this.cfg.anonKey,
      authorization: `Bearer ${this.token() ?? this.cfg.anonKey}`,
      [profileHeader]: 'learner',
    };
  }

  async rpc(fn: string, args: Record<string, unknown>): Promise<unknown> {
    const res = await fetch(`${this.cfg.url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { ...this.headers('content-profile'), 'content-type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(`supabase rpc ${fn} failed: ${res.status}`);
    return res.status === 204 ? null : res.json();
  }

  async selectOne(table: string, query: string): Promise<Record<string, unknown> | null> {
    const res = await fetch(`${this.cfg.url}/rest/v1/${table}?${query}&limit=1`, {
      headers: this.headers('accept-profile'),
    });
    if (!res.ok) throw new Error(`supabase select ${table} failed: ${res.status}`);
    const rows = (await res.json()) as Record<string, unknown>[];
    return rows[0] ?? null;
  }

  async upsert(table: string, row: Record<string, unknown>, onConflict: string): Promise<void> {
    const res = await fetch(`${this.cfg.url}/rest/v1/${table}?on_conflict=${onConflict}`, {
      method: 'POST',
      headers: {
        ...this.headers('content-profile'),
        'content-type': 'application/json',
        prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error(`supabase upsert ${table} failed: ${res.status}`);
  }
}
