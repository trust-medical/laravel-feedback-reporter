import { afterEach, describe, expect, it, vi } from 'vitest'
import { createId } from '../resources/js/id'

const CLIENT_REPORT_ID = /^[A-Za-z0-9_-]{8,64}$/

describe('createId', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('produces a server-compatible identifier', () => {
    expect(createId()).toMatch(CLIENT_REPORT_ID)
  })

  it('falls back when randomUUID is unavailable in an insecure context', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => bytes.fill(171),
    })

    const id = createId()

    expect(id).toMatch(CLIENT_REPORT_ID)
    expect(id).toBe('abababab-abab-abab-abab-abababababab')
  })

  it('falls back when the Web Crypto API is missing entirely', () => {
    vi.stubGlobal('crypto', undefined)

    expect(createId()).toMatch(CLIENT_REPORT_ID)
    expect(createId()).not.toBe(createId())
  })
})
