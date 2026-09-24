import { afterEach, describe, expect, it, vi } from 'vitest'
import { breadcrumbsCollector } from '../resources/js/diagnostics/breadcrumbs'
import { consoleCollector } from '../resources/js/diagnostics/console'
import { errorCollector } from '../resources/js/diagnostics/errors'

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
