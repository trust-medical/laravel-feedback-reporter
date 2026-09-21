import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CaptureError } from '../resources/js/errors'
import { createFeedbackReporter } from '../resources/js/reporter'

describe('FeedbackReporter SDK', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('checks availability against server endpoint', async () => {
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ available: true }), { status: 200 }))

    const reporter = createFeedbackReporter({
      availabilityEndpoint: '/custom-avail',
    })

    const isAvail = await reporter.isAvailable()
    expect(isAvail).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      '/custom-avail',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('continues report submission when automatic capture fails if captureFailure is continue', async () => {
    // 1. Availability check
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ available: true }), { status: 200 }))
      // 2. Submit check
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: '01J8ABCDEF', success: true }), { status: 201 }),
      )

    const reporter = createFeedbackReporter({
      capture: {
        captureFailure: 'continue',
      },
    })

    // Mock capture to throw CaptureError
    vi.spyOn(reporter, 'capture').mockRejectedValueOnce(new CaptureError('DOM snapshot failed'))

    const result = await reporter.report({
      message: 'Bug report with failed capture',
    })

    expect(result.id).toBe('01J8ABCDEF')
    expect(result.success).toBe(true)
  })

  it('throws error when automatic capture fails and captureFailure is throw', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ available: true }), { status: 200 }),
    )

    const reporter = createFeedbackReporter({
      capture: {
        captureFailure: 'throw',
      },
    })

    vi.spyOn(reporter, 'capture').mockRejectedValueOnce(new CaptureError('DOM snapshot failed'))

    await expect(reporter.report({ message: 'Will fail' })).rejects.toThrow(CaptureError)
  })
})
