import type { UrlSanitizationOptions } from './types'

export function sanitizeUrl(rawUrl: string, options?: UrlSanitizationOptions): string {
  try {
    const parsed = new URL(rawUrl, window.location.origin)
    let sanitized = `${parsed.origin}${parsed.pathname}`

    // Handle query string
    if (options?.query?.mode === 'allowlist' && options.query.keys?.length) {
      const allowedKeys = new Set(options.query.keys)
      const newParams = new URLSearchParams()
      for (const [key, val] of parsed.searchParams.entries()) {
        if (allowedKeys.has(key)) {
          newParams.append(key, val)
        }
      }
      const qs = newParams.toString()
      if (qs) {
        sanitized += `?${qs}`
      }
    }

    // Handle hash
    if (options?.hash && parsed.hash) {
      sanitized += parsed.hash
    }

    return sanitized
  } catch {
    return rawUrl.split('?')[0]?.split('#')[0] || ''
  }
}

export function truncateString(val: string, maxLength: number = 1000): string {
  if (val.length <= maxLength) {
    return val
  }
  return `${val.slice(0, maxLength)}...[TRUNCATED]`
}
