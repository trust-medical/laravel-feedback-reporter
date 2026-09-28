import type { UrlSanitizationOptions } from './types'

export function sanitizeUrl(rawUrl: string, options?: UrlSanitizationOptions): string {
  try {
    const parsed = new URL(rawUrl, window.location.origin)
    let sanitized = `${parsed.origin}${parsed.pathname}`

    // Handle query string (removed entirely unless a mode is configured)
    const query = options?.query
    if (query?.mode === 'allowlist' || query?.mode === 'exclude') {
      const keys = new Set(query.keys ?? [])
      const newParams = new URLSearchParams()
      for (const [key, val] of parsed.searchParams.entries()) {
        const listed = keys.has(key)
        if (query.mode === 'allowlist' ? listed : !listed) {
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

/**
 * Replace every absolute URL inside free text (for example a stack trace) with its
 * sanitized form so query strings and fragments are not leaked.
 */
export function sanitizeUrlsInText(text: string, options?: UrlSanitizationOptions): string {
  return text.replace(/\b(?:https?|wss?):\/\/[^\s()<>"'`]+/g, (match) => {
    // Keep a trailing ":line:column" location suffix outside the URL being sanitized.
    const location = match.match(/(?::\d+){1,2}$/)?.[0] ?? ''
    const url = location ? match.slice(0, -location.length) : match
    return `${sanitizeUrl(url, options)}${location}`
  })
}

/**
 * Serialize an arbitrary value into a bounded string without walking huge objects.
 * Depth, key count, array length, and total output length are all capped.
 */
export function safeStringify(value: unknown, maxLength: number = 500): string {
  const seen = new WeakSet<object>()
  let budget = maxLength

  const walk = (current: unknown, depth: number): string => {
    if (budget <= 0) {
      return ''
    }

    let out: string
    if (current === null || typeof current !== 'object') {
      if (typeof current === 'string') {
        out = JSON.stringify(current.length > budget ? current.slice(0, budget) : current)
      } else if (typeof current === 'bigint' || typeof current === 'symbol') {
        out = String(current)
      } else if (typeof current === 'function') {
        out = '"[Function]"'
      } else if (current === undefined) {
        out = 'undefined'
      } else {
        out = JSON.stringify(current)
      }
      budget -= out.length
      return out
    }

    if (seen.has(current)) {
      budget -= 12
      return '"[Circular]"'
    }
    if (depth >= 3) {
      budget -= 10
      return Array.isArray(current) ? '"[Array]"' : '"[Object]"'
    }
    seen.add(current)

    if (Array.isArray(current)) {
      const items: string[] = []
      for (const item of current.slice(0, 20)) {
        if (budget <= 0) break
        items.push(walk(item, depth + 1))
      }
      budget -= 2
      return `[${items.join(',')}]`
    }

    const parts: string[] = []
    for (const key of Object.keys(current).slice(0, 20)) {
      if (budget <= 0) break
      budget -= key.length + 3
      parts.push(
        `${JSON.stringify(key)}:${walk((current as Record<string, unknown>)[key], depth + 1)}`,
      )
    }
    budget -= 2
    return `{${parts.join(',')}}`
  }

  try {
    return truncateString(walk(value, 0), maxLength)
  } catch {
    return truncateString(String(value), maxLength)
  }
}
