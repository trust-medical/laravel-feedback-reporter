import { describe, expect, it } from 'vitest'
import {
  safeStringify,
  sanitizeUrl,
  sanitizeUrlsInText,
  truncateString,
} from '../resources/js/sanitizer'

describe('sanitizer', () => {
  it('strips query parameters and hash by default', () => {
    const raw = 'https://example.com/order?id=123&token=secret#details'
    const result = sanitizeUrl(raw)
    expect(result).toBe('https://example.com/order')
  })

  it('preserves allowed query parameters when configured', () => {
    const raw = 'https://example.com/items?page=2&sort=asc&api_key=secret'
    const result = sanitizeUrl(raw, {
      query: {
        mode: 'allowlist',
        keys: ['page', 'sort'],
      },
    })
    expect(result).toBe('https://example.com/items?page=2&sort=asc')
  })

  it('preserves hash when hash option is true', () => {
    const raw = 'https://example.com/help#faq'
    const result = sanitizeUrl(raw, { hash: true })
    expect(result).toBe('https://example.com/help#faq')
  })

  it('truncates strings exceeding maxLength', () => {
    const longStr = 'a'.repeat(200)
    const truncated = truncateString(longStr, 50)
    expect(truncated.length).toBeLessThan(100)
    expect(truncated).toContain('...[TRUNCATED]')
  })
})

describe('sanitizer exclude mode and helpers', () => {
  it('keeps every query parameter except excluded keys', () => {
    const raw = 'https://example.com/items?page=2&token=secret&sort=asc'

    expect(sanitizeUrl(raw, { query: { mode: 'exclude', keys: ['token'] } })).toBe(
      'https://example.com/items?page=2&sort=asc',
    )
  })

  it('sanitizes URLs embedded in stack traces while keeping line numbers', () => {
    const stack = 'Error: x\n    at run (https://example.com/app.js?v=1&token=secret:10:5)'

    expect(sanitizeUrlsInText(stack)).toBe('Error: x\n    at run (https://example.com/app.js:10:5)')
  })

  it('serializes large and circular objects within the length budget', () => {
    const circular: Record<string, unknown> = { name: 'root' }
    circular.self = circular
    const huge = { items: Array.from({ length: 10000 }, (_, i) => ({ i, text: 'x'.repeat(100) })) }

    expect(safeStringify(circular)).toContain('[Circular]')
    expect(safeStringify(huge, 200).length).toBeLessThanOrEqual(200 + '...[TRUNCATED]'.length)
  })
})
