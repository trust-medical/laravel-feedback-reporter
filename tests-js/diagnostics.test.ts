import { afterEach, describe, expect, it, vi } from 'vitest'
import { breadcrumbsCollector } from '../resources/js/diagnostics/breadcrumbs'
import { consoleCollector } from '../resources/js/diagnostics/console'
import { errorCollector } from '../resources/js/diagnostics/errors'
import { networkErrorCollector } from '../resources/js/diagnostics/network'

describe('diagnostics collectors', () => {
  afterEach(() => {
    errorCollector.destroy()
    consoleCollector.destroy()
    breadcrumbsCollector.destroy()
  })

  it('errorCollector maintains ring buffer with maximum capacity', () => {
    errorCollector.init(3)

    for (let i = 1; i <= 5; i++) {
      errorCollector.add({
        type: 'error',
        message: `Error ${i}`,
        timestamp: new Date().toISOString(),
      })
    }

    const errors = errorCollector.get()
    expect(errors).toHaveLength(3)
    expect(errors[0]?.message).toBe('Error 3')
    expect(errors[2]?.message).toBe('Error 5')
  })

  it('consoleCollector records console.error and preserves output', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    consoleCollector.init(10)
    console.error('Test error message', 123)

    const entries = consoleCollector.get()
    expect(entries).toHaveLength(1)
    expect(entries[0]?.level).toBe('error')
    expect(entries[0]?.messages).toContain('Test error message')

    spy.mockRestore()
  })

  it('keeps shared console instrumentation until the last subscriber is destroyed', () => {
    const original = console.error
    consoleCollector.init(10)
    const wrapper = console.error
    consoleCollector.init(10)

    consoleCollector.destroy()

    expect(console.error).toBe(wrapper)
    consoleCollector.destroy()
    expect(console.error).toBe(original)
  })

  it('does not overwrite a console wrapper installed after its own wrapper', () => {
    const original = console.error
    consoleCollector.init(10)
    const laterWrapper = (..._args: unknown[]) => undefined
    console.error = laterWrapper

    consoleCollector.destroy()

    expect(console.error).toBe(laterWrapper)
    console.error = original
  })

  it('observes errors without replacing window.onerror', () => {
    const original = window.onerror
    errorCollector.init(10)

    expect(window.onerror).toBe(original)
  })

  it('breadcrumbsCollector captures clicks safely without input values', () => {
    breadcrumbsCollector.init(10)

    const btn = document.createElement('button')
    btn.id = 'submit-button'
    btn.className = 'btn primary'
    document.body.appendChild(btn)

    btn.click()

    const crumbs = breadcrumbsCollector.get()
    expect(crumbs.length).toBeGreaterThan(0)
    expect(crumbs[0]?.category).toBe('click')
    expect(crumbs[0]?.data?.id).toBe('submit-button')

    document.body.removeChild(btn)
  })
})

describe('diagnostics collector hardening', () => {
  afterEach(() => {
    errorCollector.destroy()
    consoleCollector.destroy()
    networkErrorCollector.destroy()
    vi.restoreAllMocks()
  })

  it('falls back to the default buffer size for invalid maxEntries', () => {
    errorCollector.init(Number.NaN)

    for (let i = 0; i < 30; i++) {
      errorCollector.add({ type: 'error', message: `Error ${i}`, timestamp: '' })
    }

    expect(errorCollector.get()).toHaveLength(20)
  })

  it('does not wrap console twice after another wrapper blocked restoration', () => {
    const realError = console.error
    const baseError = vi.fn()
    console.error = baseError
    consoleCollector.init(10)
    const ownWrapper = console.error
    const laterWrapper = (...args: unknown[]) => ownWrapper(...args)
    console.error = laterWrapper

    consoleCollector.destroy()
    expect(console.error).toBe(laterWrapper)

    // A fresh wrapper goes on top; the inactive one underneath only passes calls through.
    consoleCollector.init(10)

    console.error('once')
    expect(consoleCollector.get()).toHaveLength(1)
    expect(baseError).toHaveBeenCalledTimes(1)

    console.error = realError
  })

  it('bounds serialized console arguments', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleCollector.init(10)

    console.warn(...Array.from({ length: 15 }, (_, i) => ({ index: i, text: 'y'.repeat(2000) })))

    const [entry] = consoleCollector.get()
    expect(entry?.messages).toHaveLength(11)
    expect(entry?.messages[10]).toBe('...[5 more arguments]')
    for (const message of entry?.messages.slice(0, 10) ?? []) {
      expect(message.length).toBeLessThanOrEqual(500 + '...[TRUNCATED]'.length)
    }
  })

  it('records failed fetch requests with sanitized URLs and restores fetch', async () => {
    const original = window.fetch
    const stub = vi.fn(async () => new Response('', { status: 500 })) as unknown as typeof fetch
    window.fetch = stub
    networkErrorCollector.init(10)

    try {
      expect(window.fetch).not.toBe(stub)
      await window.fetch('https://example.com/api/items?token=secret')

      const [entry] = networkErrorCollector.get()
      expect(entry).toMatchObject({
        method: 'GET',
        url: 'https://example.com/api/items',
        status: 500,
      })

      networkErrorCollector.destroy()
      expect(window.fetch).toBe(stub)
    } finally {
      window.fetch = original
    }
  })

  it('sanitizes script URLs in captured error events', () => {
    errorCollector.init(10)

    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'Boom',
        filename: 'https://example.com/app.js?token=secret',
        error: new Error('Boom'),
      }),
    )

    expect(errorCollector.get()[0]?.source).toBe('https://example.com/app.js')
  })
})
