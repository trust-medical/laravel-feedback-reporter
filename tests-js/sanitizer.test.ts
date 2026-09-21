import { describe, expect, it } from 'vitest'
import { sanitizeUrl, truncateString } from '../resources/js/sanitizer'

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
