import {
  AvailabilityError,
  PayloadTooLargeError,
  RateLimitError,
  ServerError,
  SessionExpiredError,
  TimeoutError,
  TransportError,
  ValidationError,
} from './errors'
import { normalizeLimits } from './limits'
import type { FeedbackAvailability, FeedbackReporterConfig, FeedbackSubmitResponse } from './types'

export const DEFAULT_TIMEOUT_MS = 60000

export function getCsrfToken(config?: FeedbackReporterConfig): string | null {
  if (config?.csrfToken) {
    return typeof config.csrfToken === 'function' ? config.csrfToken() : config.csrfToken
  }

  if (typeof document !== 'undefined') {
    const metaTag = document.querySelector('meta[name="csrf-token"]')
    if (metaTag) {
      return metaTag.getAttribute('content')
    }
  }

  return null
}

interface TimedSignal {
  signal: AbortSignal
  timedOut: () => boolean
  cleanup: () => void
}

/**
 * Combine the caller's signal with a timeout without relying on AbortSignal.any,
 * which older browsers do not implement.
 */
function withTimeout(signal: AbortSignal | undefined, timeoutMs: number): TimedSignal {
  const controller = new AbortController()
  let didTimeOut = false
  let timer: ReturnType<typeof setTimeout> | null = null

  const abortFromCaller = () => controller.abort(signal?.reason)

  if (signal?.aborted) {
    controller.abort(signal.reason)
  } else {
    signal?.addEventListener('abort', abortFromCaller, { once: true })
  }

  if (timeoutMs > 0 && Number.isFinite(timeoutMs)) {
    timer = setTimeout(() => {
      didTimeOut = true
      controller.abort()
    }, timeoutMs)
  }

  return {
    signal: controller.signal,
    timedOut: () => didTimeOut,
    cleanup: () => {
      if (timer !== null) {
        clearTimeout(timer)
      }
      signal?.removeEventListener('abort', abortFromCaller)
    },
  }
}

function resolveTimeout(config?: FeedbackReporterConfig): number {
  const timeout = config?.timeoutMs
  return typeof timeout === 'number' && timeout >= 0 ? timeout : DEFAULT_TIMEOUT_MS
}

async function request(
  url: string,
  init: RequestInit,
  config: FeedbackReporterConfig | undefined,
  signal: AbortSignal | undefined,
): Promise<Response> {
  const timeoutMs = resolveTimeout(config)
  const timed = withTimeout(signal, timeoutMs)

  try {
    return await fetch(url, {
      credentials: 'same-origin',
      ...init,
      signal: timed.signal,
    })
  } catch (err) {
    if (timed.timedOut()) {
      throw new TimeoutError(timeoutMs)
    }
    if (signal?.aborted) {
      throw err
    }
    throw new TransportError(
      `Network request failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  } finally {
    timed.cleanup()
  }
}

/**
 * Fetch the availability state and the server's advertised limits.
 *
 * Unlike `checkAvailability`, this surfaces rate limiting, timeouts, and network
 * failures as errors so callers can tell them apart from "unavailable".
 */
export async function fetchAvailability(
  config?: FeedbackReporterConfig,
  signal?: AbortSignal,
): Promise<FeedbackAvailability> {
  const url = config?.availabilityEndpoint || '/feedback-reporter/availability'

  const res = await request(
    url,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    },
    config,
    signal,
  )

  if (res.status === 429) {
    throw new RateLimitError('Too many availability checks. Please wait before retrying.')
  }

  if (!res.ok) {
    return { available: false }
  }

  let data: { available?: unknown; limits?: unknown }
  try {
    data = (await res.json()) as { available?: unknown; limits?: unknown }
  } catch {
    throw new TransportError('The availability response was not valid JSON.', res.status)
  }

  const available = data?.available === true

  return available && data.limits !== undefined
    ? { available, limits: normalizeLimits(data.limits) }
    : { available }
}

/**
 * Return whether the reporter is available. Any failure is reported as `false`.
 */
export async function checkAvailability(
  config?: FeedbackReporterConfig,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    return (await fetchAvailability(config, signal)).available
  } catch (err) {
    if (signal?.aborted) {
      throw err
    }
    return false
  }
}

export async function sendFeedbackReport(
  formData: FormData,
  config?: FeedbackReporterConfig,
  signal?: AbortSignal,
): Promise<FeedbackSubmitResponse> {
  const url = config?.endpoint || '/feedback-reporter/reports'

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }

  const csrf = getCsrfToken(config)
  if (csrf) {
    headers['X-CSRF-TOKEN'] = csrf
  }

  if (config?.headers) {
    const customHeaders =
      typeof config.headers === 'function' ? await config.headers() : config.headers
    Object.assign(headers, customHeaders)
  }

  // Do NOT set Content-Type header manually for FormData; browser sets boundary automatically

  const res = await request(url, { method: 'POST', headers, body: formData }, config, signal)

  let responseBody: unknown = null
  let isJson = true
  try {
    responseBody = await res.json()
  } catch {
    isJson = false
  }

  if (res.status === 200 || res.status === 201) {
    const body = responseBody as Partial<FeedbackSubmitResponse> | null
    if (!isJson || typeof body?.id !== 'string') {
      throw new TransportError(
        'The feedback response was not valid JSON.',
        res.status,
        responseBody,
      )
    }
    return body as FeedbackSubmitResponse
  }

  if (res.status === 422) {
    const errorData = responseBody as { message?: string; errors?: Record<string, string[]> }
    throw new ValidationError(
      errorData?.message || 'Validation failed for feedback submission.',
      errorData?.errors || {},
      res.status,
    )
  }

  if (res.status === 429) {
    throw new RateLimitError(
      'Too many feedback submissions. Please wait before retrying.',
      res.status,
    )
  }

  if (res.status === 419) {
    throw new SessionExpiredError(undefined, res.status)
  }

  if (res.status === 413) {
    throw new PayloadTooLargeError(undefined, res.status)
  }

  if (res.status === 403 || res.status === 404) {
    throw new AvailabilityError('Feedback reporter is currently unavailable.', res.status)
  }

  if (res.status >= 500) {
    throw new ServerError('Server encountered an error while processing feedback.', res.status)
  }

  throw new TransportError(
    `Unexpected response status code: ${res.status}`,
    res.status,
    responseBody,
  )
}
