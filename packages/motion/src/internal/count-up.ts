/**
 * Pure number-stepping for the count-up primitive. Kept free of React/framer-motion so the value
 * logic (the part with rounding and clamping bugs) is unit-tested in isolation.
 */

export interface FormatNumberOptions {
  decimals?: number;
  /** BCP-47 locale for grouping separators; omit for a plain fixed-decimal string. */
  locale?: string;
  prefix?: string;
  suffix?: string;
}

/**
 * The displayed value at eased progress `t` (0..1) between `from` and `to`.
 * `t` is clamped, so over/undershooting callers can't produce values outside the range.
 */
export function countUpValue(from: number, to: number, t: number, decimals = 0): number {
  const clamped = t <= 0 ? 0 : t >= 1 ? 1 : t;
  const raw = from + (to - from) * clamped;
  const factor = 10 ** decimals;
  return Math.round(raw * factor) / factor;
}

/** Format a real number for display. Returns an empty-ish guard for non-finite input. */
export function formatNumber(value: number, options: FormatNumberOptions = {}): string {
  const { decimals = 0, locale, prefix = '', suffix = '' } = options;
  const safe = Number.isFinite(value) ? value : 0;
  const body = locale
    ? safe.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : safe.toFixed(decimals);
  return `${prefix}${body}${suffix}`;
}
