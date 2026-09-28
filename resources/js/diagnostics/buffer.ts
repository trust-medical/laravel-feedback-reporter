/**
 * Coerce a configured ring-buffer size into a safe positive integer.
 * NaN, negative, zero, and non-numeric values fall back to the default.
 */
export function normalizeMaxEntries(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1
    ? Math.min(Math.floor(value), 500)
    : fallback
}
