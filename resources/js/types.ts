export type FeedbackImageSource = 'user_screenshot' | 'attachment'

export interface FeedbackAttachmentInput {
  file: File | Blob
  source: FeedbackImageSource
  filename?: string
}

export interface UrlSanitizationOptions {
  /**
   * Query string handling. Without this option every query parameter is removed.
   * - `allowlist`: keep only the listed keys.
   * - `exclude`: keep every parameter except the listed keys.
   */
  query?: {
    mode: 'exclude' | 'allowlist'
    keys?: string[]
  }
  hash?: boolean
}

export interface StorageOptions {
  localStorageKeys?: string[]
  sessionStorageKeys?: string[]
}

export interface DiagnosticsOptions {
  errors?: boolean | { maxEntries?: number }
  console?: boolean | { maxEntries?: number }
  network?: boolean | { maxEntries?: number }
  breadcrumbs?: boolean | { maxEntries?: number }
  performance?: boolean
}

export interface FeedbackSubmitResponse {
  id: string
  success: boolean
  /** True when the server matched an earlier submission with the same client report ID. */
  duplicate?: boolean
}

/** Server-side limits advertised by the availability endpoint. */
export interface FeedbackLimits {
  maxFiles: number
  maxFileSizeKb: number
  maxTotalSizeKb: number
  allowedMimes: string[]
  maxMessageLength: number
  maxMetadataBytes: number
  maxMetadataDepth: number
}

export interface FeedbackAvailability {
  available: boolean
  /** Present only when available. Older servers omit it. */
  limits?: FeedbackLimits
}

export interface FeedbackReporterCallbacks {
  onContextCollected?: (context: Record<string, unknown>) => void
  onSubmitStart?: () => void
  onSubmitSuccess?: (response: FeedbackSubmitResponse) => void
  onSubmitError?: (error: unknown) => void
}

export interface FeedbackReporterConfig {
  endpoint?: string
  availabilityEndpoint?: string
  csrfToken?: string | (() => string | null)
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>)
  url?: UrlSanitizationOptions
  storage?: StorageOptions
  metadata?:
    | Record<string, unknown>
    | (() => Record<string, unknown> | Promise<Record<string, unknown>>)
  diagnostics?: DiagnosticsOptions
  callbacks?: FeedbackReporterCallbacks
  /** Request timeout in milliseconds for availability checks and submissions. 0 disables it. Default: 60000. */
  timeoutMs?: number
}

export interface FeedbackReportOptions {
  message: string
  attachments?: FeedbackAttachmentInput[]
  metadata?:
    | Record<string, unknown>
    | (() => Record<string, unknown> | Promise<Record<string, unknown>>)
  signal?: AbortSignal
  /**
   * Idempotency key (`^[A-Za-z0-9_-]{8,64}$`). Reuse the same value when retrying the
   * same report so the server returns the stored report instead of creating a duplicate.
   * A new key is generated when omitted.
   */
  clientReportId?: string
}

export interface DiagnosticContext {
  page?: Record<string, unknown>
  viewport?: Record<string, unknown>
  screen?: Record<string, unknown>
  browser?: Record<string, unknown>
  network?: Record<string, unknown>
  performance?: Record<string, unknown>
  active_element?: Record<string, unknown>
  storage?: Record<string, unknown>
  errors?: unknown[]
  console?: unknown[]
  network_errors?: unknown[]
  breadcrumbs?: unknown[]
  application?: Record<string, unknown>
}
