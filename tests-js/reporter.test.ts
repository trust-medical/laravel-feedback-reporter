import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFeedbackReporter } from '../resources/js/reporter'

describe('FeedbackReporter SDK', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it('checks availability against the configured endpoint', async () => {
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ available: true }), { status: 200 }))
    const reporter = createFeedbackReporter({ availabilityEndpoint: '/custom-availability' })

    const available = await reporter.isAvailable()

    expect(available).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      '/custom-availability',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('reports with only user-provided attachments and no capture metadata', async () => {
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ available: true }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: '01J8ABCDEF', success: true }), { status: 201 }),
      )
    const reporter = createFeedbackReporter({
      endpoint: '/feedback',
      availabilityEndpoint: '/availability',
    })
    const screenshot = new File(['image'], 'screen.png', { type: 'image/png' })

    const result = await reporter.report({
      message: 'The button is misaligned.',
      attachments: [{ file: screenshot, source: 'user_screenshot' }],
    })

    expect(result).toEqual({ id: '01J8ABCDEF', success: true })
    const request = fetchMock.mock.calls[1]?.[1]
    const formData = request?.body as FormData
    expect(formData.get('attachments[0][source]')).toBe('user_screenshot')
    expect(formData.get('report_metadata')).toBeNull()
    expect(JSON.parse(String(formData.get('metadata')))).not.toHaveProperty('capture')
  })

  it('does not replace browser globals unless invasive diagnostics are enabled', () => {
    const originalFetch = window.fetch
    const originalConsoleError = console.error
    const originalConsoleWarn = console.warn
    const originalXhrOpen = XMLHttpRequest.prototype.open
    const originalXhrSend = XMLHttpRequest.prototype.send
    const originalOnError = window.onerror

    const reporter = createFeedbackReporter()

    expect(window.fetch).toBe(originalFetch)
    expect(console.error).toBe(originalConsoleError)
    expect(console.warn).toBe(originalConsoleWarn)
    expect(XMLHttpRequest.prototype.open).toBe(originalXhrOpen)
    expect(XMLHttpRequest.prototype.send).toBe(originalXhrSend)
    expect(window.onerror).toBe(originalOnError)
    reporter.destroyDiagnostics()
  })
})
