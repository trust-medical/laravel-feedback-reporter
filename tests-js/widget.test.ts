import { afterEach, describe, expect, it, vi } from 'vitest'
import { FeedbackReporterElement, registerFeedbackReporterElement } from '../resources/js/widget'

describe('feedback reporter web component', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.documentElement.lang = ''
  })

  it('registers idempotently and renders an open isolated shadow root', () => {
    registerFeedbackReporterElement()
    registerFeedbackReporterElement()
    document.documentElement.lang = 'ja'
    const element = document.createElement('trust-feedback-reporter')

    document.body.append(element)

    expect(element).toBeInstanceOf(FeedbackReporterElement)
    expect(element.shadowRoot).not.toBeNull()
    expect(element.shadowRoot?.querySelector('[data-feedback-launcher]')?.textContent).toContain(
      'フィードバックを報告',
    )
    expect(document.querySelector('[data-feedback-launcher]')).toBeNull()
  })

  it('uses English labels outside Japanese documents', () => {
    registerFeedbackReporterElement()
    document.documentElement.lang = 'en'
    const element = document.createElement('trust-feedback-reporter')

    document.body.append(element)

    expect(element.shadowRoot?.querySelector('[data-feedback-launcher]')?.textContent).toContain(
      'Send feedback',
    )
  })

  it('does not replace host globals when connected with default settings', () => {
    registerFeedbackReporterElement()
    const originalFetch = window.fetch
    const originalConsoleError = console.error
    const originalOnError = window.onerror
    const element = document.createElement('trust-feedback-reporter')

    document.body.append(element)

    expect(window.fetch).toBe(originalFetch)
    expect(console.error).toBe(originalConsoleError)
    expect(window.onerror).toBe(originalOnError)
  })

  it('supports an idempotently registered custom tag name', () => {
    registerFeedbackReporterElement('custom-feedback-reporter')
    registerFeedbackReporterElement('custom-feedback-reporter')

    const element = document.createElement('custom-feedback-reporter')
    document.body.append(element)

    expect(element).toBeInstanceOf(FeedbackReporterElement)
    expect(element.shadowRoot?.querySelector('[data-feedback-launcher]')).not.toBeNull()
  })

  it('honors the language and color scheme attributes', () => {
    registerFeedbackReporterElement()
    const element = document.createElement('trust-feedback-reporter')
    element.lang = 'ja'
    element.setAttribute('color-scheme', 'dark')

    document.body.append(element)

    expect(element.shadowRoot?.querySelector('[data-feedback-launcher]')?.textContent).toContain(
      'フィードバックを報告',
    )
    expect(element.getAttribute('color-scheme')).toBe('dark')
    expect(element.shadowRoot?.querySelector('style')?.textContent).toContain(
      ':host([color-scheme="dark"])',
    )
  })

  it('can reconnect without leaking its previous shadow content', () => {
    registerFeedbackReporterElement()
    const element = document.createElement('trust-feedback-reporter')
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL')

    document.body.append(element)
    element.remove()
    document.body.append(element)

    expect(element.shadowRoot?.querySelectorAll('[data-feedback-launcher]')).toHaveLength(1)
    expect(revokeObjectUrl).not.toHaveBeenCalled()
  })
})
