import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorCollector } from '../resources/js/diagnostics/errors'
import {
  AttachmentValidationError,
  AvailabilityError,
  ValidationError,
} from '../resources/js/errors'
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

describe('FeedbackReporter submission hardening', () => {
  afterEach(() => vi.restoreAllMocks())

  function created(): Response {
    return new Response(JSON.stringify({ id: '01J8ABCDEF', success: true }), { status: 201 })
  }

  it('reuses a provided client report ID so retries can be deduplicated', async () => {
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockResolvedValueOnce(created())
      .mockResolvedValueOnce(created())
    const reporter = createFeedbackReporter()

    await reporter.submit({ message: 'First try', clientReportId: 'draft-12345678' })
    await reporter.submit({ message: 'Retry', clientReportId: 'draft-12345678' })

    const ids = fetchMock.mock.calls.map((call) =>
      (call[1]?.body as FormData | undefined)?.get('client_report_id'),
    )
    expect(ids).toEqual(['draft-12345678', 'draft-12345678'])
  })

  it('truncates page fields to the server column limits', async () => {
    const fetchMock = vi.spyOn(window, 'fetch').mockResolvedValueOnce(created())
    document.title = 'T'.repeat(400)
    const reporter = createFeedbackReporter()

    await reporter.submit({ message: 'Long title' })

    const formData = fetchMock.mock.calls[0]?.[1]?.body as FormData
    expect(String(formData.get('page_title'))).toHaveLength(255)
    expect(String(formData.get('page_url')).length).toBeLessThanOrEqual(2048)
    document.title = ''
  })

  it('rejects oversized or deeply nested metadata before uploading', async () => {
    const fetchMock = vi.spyOn(window, 'fetch')
    const onSubmitError = vi.fn()
    const reporter = createFeedbackReporter({ callbacks: { onSubmitError } })
    let nested: Record<string, unknown> = {}
    for (let i = 0; i < 12; i++) {
      nested = { child: nested }
    }

    const tooLarge = await reporter
      .submit({ message: 'Big', metadata: { blob: 'x'.repeat(300 * 1024) } })
      .catch((err: unknown) => err)
    const tooDeep = await reporter
      .submit({ message: 'Deep', metadata: nested })
      .catch((err: unknown) => err)

    expect(tooLarge).toBeInstanceOf(ValidationError)
    expect((tooLarge as ValidationError).statusCode).toBe(0)
    expect(tooDeep).toBeInstanceOf(ValidationError)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(onSubmitError).toHaveBeenCalledTimes(2)
  })

  it('passes attachment validation failures to onSubmitError', async () => {
    const onSubmitError = vi.fn()
    const reporter = createFeedbackReporter({ callbacks: { onSubmitError } })

    await expect(
      reporter.submit({
        message: 'Wrong type',
        attachments: [{ file: new Blob(['x'], { type: 'text/html' }), source: 'attachment' }],
      }),
    ).rejects.toBeInstanceOf(AttachmentValidationError)
    expect(onSubmitError).toHaveBeenCalledWith(expect.any(AttachmentValidationError))
  })

  it('applies the limits advertised by the availability endpoint', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ available: true, limits: { max_files: 1 } }), {
        status: 200,
      }),
    )
    const reporter = createFeedbackReporter()
    const image = new Blob(['x'], { type: 'image/png' })

    await expect(
      reporter.report({
        message: 'Two files',
        attachments: [
          { file: image, source: 'attachment' },
          { file: image, source: 'attachment' },
        ],
      }),
    ).rejects.toBeInstanceOf(AttachmentValidationError)
    expect(reporter.getLimits().maxFiles).toBe(1)
  })

  it('reports an unavailable server as AvailabilityError with the response status', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ available: false }), { status: 200 }),
    )

    const error = await createFeedbackReporter()
      .report({ message: 'Hello' })
      .catch((err: unknown) => err)

    expect(error).toBeInstanceOf(AvailabilityError)
    expect((error as AvailabilityError).statusCode).toBe(200)
  })

  it('does not include diagnostics collected for another reporter', async () => {
    const collecting = createFeedbackReporter({ diagnostics: { errors: true } })
    const plain = createFeedbackReporter()
    errorCollector.add({ type: 'error', message: 'Other reporter', timestamp: '' })

    const collectingContext = await collecting.collectContext()
    const plainContext = await plain.collectContext()

    expect(collectingContext.errors).toHaveLength(1)
    expect(plainContext.errors).toBeUndefined()
    collecting.destroyDiagnostics()
  })
})
