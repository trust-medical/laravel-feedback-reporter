import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AvailabilityError,
  PayloadTooLargeError,
  RateLimitError,
  ServerError,
  SessionExpiredError,
  TimeoutError,
  TransportError,
  ValidationError,
} from '../resources/js/errors'
import { checkAvailability, fetchAvailability, sendFeedbackReport } from '../resources/js/transport'

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('transport', () => {
  afterEach(() => vi.restoreAllMocks())

  it('treats both 201 and a duplicate 200 as success', async () => {
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(json({ id: 'a', success: true }, 201))
      .mockResolvedValueOnce(json({ id: 'a', success: true, duplicate: true }, 200))

    await expect(sendFeedbackReport(new FormData())).resolves.toEqual({ id: 'a', success: true })
    await expect(sendFeedbackReport(new FormData())).resolves.toEqual({
      id: 'a',
      success: true,
      duplicate: true,
    })
  })

  it('sends same-origin credentials and an XHR header', async () => {
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockResolvedValueOnce(json({ id: 'a', success: true }, 201))

    await sendFeedbackReport(new FormData(), { csrfToken: 'token' })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.credentials).toBe('same-origin')
    expect(init.headers).toMatchObject({
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': 'token',
    })
  })

  it('sends custom headers with availability checks and submissions', async () => {
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockResolvedValueOnce(json({ available: true }, 200))
      .mockResolvedValueOnce(json({ available: true }, 200))
      .mockResolvedValueOnce(json({ id: 'a', success: true }, 201))

    await fetchAvailability({ headers: { 'X-Feedback-Token': 'static' } })
    await fetchAvailability({ headers: async () => ({ 'X-Feedback-Token': 'dynamic' }) })
    await sendFeedbackReport(new FormData(), { headers: { 'X-Feedback-Token': 'static' } })

    const sent = fetchMock.mock.calls.map((call) => (call[1] as RequestInit).headers)
    expect(sent[0]).toMatchObject({
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Feedback-Token': 'static',
    })
    expect(sent[1]).toMatchObject({ 'X-Feedback-Token': 'dynamic' })
    expect(sent[2]).toMatchObject({ 'X-Feedback-Token': 'static' })
  })

  it('rejects a successful status with a non-JSON body', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(new Response('<html>', { status: 201 }))

    await expect(sendFeedbackReport(new FormData())).rejects.toBeInstanceOf(TransportError)
  })

  it.each([
    [422, ValidationError],
    [429, RateLimitError],
    [419, SessionExpiredError],
    [413, PayloadTooLargeError],
    [403, AvailabilityError],
    [404, AvailabilityError],
    [500, ServerError],
    [418, TransportError],
  ])('maps status %i to the matching error', async (status, errorClass) => {
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      json({ message: 'Invalid', errors: { message: ['Required'] } }, status),
    )

    const error = await sendFeedbackReport(new FormData()).catch((err: unknown) => err)

    expect(error).toBeInstanceOf(errorClass)
    expect((error as TransportError).statusCode).toBe(status)
    if (error instanceof ValidationError) {
      expect(error.errors).toEqual({ message: ['Required'] })
    }
  })

  it('aborts with a TimeoutError when the request exceeds timeoutMs', async () => {
    vi.spyOn(window, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    )

    const error = await sendFeedbackReport(new FormData(), { timeoutMs: 10 }).catch(
      (err: unknown) => err,
    )

    expect(error).toBeInstanceOf(TimeoutError)
    expect(error).toBeInstanceOf(TransportError)
  })

  it('rethrows the caller abort instead of reporting a timeout', async () => {
    vi.spyOn(window, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    )
    const controller = new AbortController()

    const pending = sendFeedbackReport(new FormData(), undefined, controller.signal)
    controller.abort()
    const error = await pending.catch((err: unknown) => err)

    expect(error).not.toBeInstanceOf(TimeoutError)
    expect((error as Error).name).toBe('AbortError')
  })

  it('returns normalized server limits from the availability endpoint', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      json(
        {
          available: true,
          limits: {
            max_files: 3,
            max_file_size_kb: 1024,
            max_total_size_kb: 2048,
            allowed_mimes: ['image/png'],
            max_message_length: 500,
            max_metadata_bytes: 1000,
            max_metadata_depth: 4,
          },
        },
        200,
      ),
    )

    await expect(fetchAvailability()).resolves.toEqual({
      available: true,
      limits: {
        maxFiles: 3,
        maxFileSizeKb: 1024,
        maxTotalSizeKb: 2048,
        allowedMimes: ['image/png'],
        maxMessageLength: 500,
        maxMetadataBytes: 1000,
        maxMetadataDepth: 4,
      },
    })
  })

  it('omits limits when an older server does not send them', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(json({ available: true }, 200))

    await expect(fetchAvailability()).resolves.toEqual({ available: true })
  })

  it('throws RateLimitError for a rate-limited availability check', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(json({}, 429))

    await expect(fetchAvailability()).rejects.toBeInstanceOf(RateLimitError)
    // The legacy boolean helper keeps reporting failures as unavailable.
    await expect(checkAvailability()).resolves.toBe(false)
  })
})
