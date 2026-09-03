/**
 * "Festivals we can wish you on" — the family's chosen calendars, read from and written to the
 * gateway's mail preferences (`hospitality/api.py`). The closed list of calendars comes from the
 * server with the preferences, and so does the one line that says what the choice is used for.
 */

import { gatewayFetch } from '@wobo/sdk';

export interface Calendar {
  id: string;
  name: string;
  community: boolean;
}

export interface MailPrefsView {
  /** The calendar ids the family chose. */
  chosen: string[];
  calendars: Calendar[];
  /** What the chosen list is used for, in the server's own words. */
  about: string;
}

export function parseMailPrefs(body: unknown): MailPrefsView | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const prefs =
    b.preferences && typeof b.preferences === 'object'
      ? (b.preferences as Record<string, unknown>)
      : {};
  const chosenRaw = prefs.festival_calendar;
  const chosen = Array.isArray(chosenRaw)
    ? chosenRaw.filter((c): c is string => typeof c === 'string')
    : [];
  const calendars = Array.isArray(b.calendars)
    ? b.calendars
        .map((c): Calendar | null => {
          if (!c || typeof c !== 'object') return null;
          const r = c as Record<string, unknown>;
          if (typeof r.id !== 'string' || typeof r.name !== 'string') return null;
          return { id: r.id, name: r.name, community: r.community === true };
        })
        .filter((c): c is Calendar => c !== null)
    : [];
  return {
    chosen,
    calendars,
    about: typeof b.about_calendars === 'string' ? b.about_calendars : '',
  };
}

/** "Hindu festivals, Tamil festivals" — the chosen calendars by name, or null for none. */
export function chosenNames(view: MailPrefsView | null): string | null {
  if (!view || view.chosen.length === 0) return null;
  const names = view.chosen
    .map((id) => view.calendars.find((c) => c.id === id)?.name ?? id)
    .filter(Boolean);
  return names.length > 0 ? names.join(', ') : null;
}

type Fetch = typeof gatewayFetch;

export async function readMailPrefs(
  gatewayUrl: string | undefined = import.meta.env.VITE_GATEWAY_URL,
  fetcher: Fetch = gatewayFetch,
): Promise<MailPrefsView | null> {
  if (!gatewayUrl) return null;
  try {
    const res = await fetcher(`${gatewayUrl}/v1/me/mail-preferences`);
    if (!res.ok) return null;
    return parseMailPrefs(await res.json());
  } catch {
    return null;
  }
}

export async function writeCalendars(
  chosen: readonly string[],
  gatewayUrl: string | undefined = import.meta.env.VITE_GATEWAY_URL,
  fetcher: Fetch = gatewayFetch,
): Promise<MailPrefsView | null> {
  if (!gatewayUrl) return null;
  try {
    const res = await fetcher(`${gatewayUrl}/v1/me/mail-preferences`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ festival_calendar: [...chosen] }),
    });
    if (!res.ok) return null;
    return parseMailPrefs(await res.json());
  } catch {
    return null;
  }
}
