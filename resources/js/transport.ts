import {
  AvailabilityError,
  RateLimitError,
  ServerError,
  TransportError,
  ValidationError,
} from './errors'
import type { FeedbackReporterConfig, FeedbackSubmitResponse } from './types'

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

export async function checkAvailability(
  config?: FeedbackReporterConfig,
  signal?: AbortSignal,
): Promise<boolean> {
  const url = config?.availabilityEndpoint || '/feedback-reporter/availability'

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
    })

    if (!res.ok) {
      return false
    }

    const data = (await res.json()) as { available?: boolean }
    return Boolean(data.available)
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

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      signal,
    })
  } catch (err) {
    if (signal?.aborted) {
      throw err
    }
    throw new TransportError(
      `Network request failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  if (res.status === 201) {
    return (await res.json()) as FeedbackSubmitResponse
  }

  let responseBody: unknown = null
  try {
    responseBody = await res.json()
  } catch {
    // Non-JSON response
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
