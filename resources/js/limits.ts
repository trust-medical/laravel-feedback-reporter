import type { FeedbackLimits } from './types'

export const DEFAULT_LIMITS: Readonly<FeedbackLimits> = Object.freeze({
  maxFiles: 5,
  maxFileSizeKb: 5120,
  maxTotalSizeKb: 20480,
  allowedMimes: ['image/png', 'image/jpeg', 'image/webp'],
  maxMessageLength: 10000,
  maxMetadataBytes: 262144,
  maxMetadataDepth: 10,
})

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback
}

/**
 * Normalize the snake_case `limits` object returned by the availability
 * endpoint. Missing or malformed values fall back to the package defaults.
 */
export function normalizeLimits(raw: unknown): FeedbackLimits {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const allowedMimes = Array.isArray(source.allowed_mimes)
    ? source.allowed_mimes.filter((mime): mime is string => typeof mime === 'string')
    : [...DEFAULT_LIMITS.allowedMimes]

  return {
    maxFiles: positiveInteger(source.max_files, DEFAULT_LIMITS.maxFiles),
    maxFileSizeKb: positiveInteger(source.max_file_size_kb, DEFAULT_LIMITS.maxFileSizeKb),
    maxTotalSizeKb: positiveInteger(source.max_total_size_kb, DEFAULT_LIMITS.maxTotalSizeKb),
    allowedMimes,
    maxMessageLength: positiveInteger(source.max_message_length, DEFAULT_LIMITS.maxMessageLength),
    maxMetadataBytes: positiveInteger(source.max_metadata_bytes, DEFAULT_LIMITS.maxMetadataBytes),
    maxMetadataDepth: positiveInteger(source.max_metadata_depth, DEFAULT_LIMITS.maxMetadataDepth),
  }
}

export function resolveLimits(limits?: Partial<FeedbackLimits> | null): FeedbackLimits {
  const resolved: FeedbackLimits = {
    ...DEFAULT_LIMITS,
    allowedMimes: [...DEFAULT_LIMITS.allowedMimes],
  }

  if (!limits) {
    return resolved
  }

  for (const key of Object.keys(limits) as Array<keyof FeedbackLimits>) {
    const value = limits[key]
    if (value !== undefined) {
      Object.assign(resolved, { [key]: value })
    }
  }

  return resolved
}
