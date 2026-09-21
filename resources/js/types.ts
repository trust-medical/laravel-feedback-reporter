export type FeedbackImageSource = 'automatic_capture' | 'user_screenshot' | 'attachment'

export interface FeedbackAttachmentInput {
  file: File | Blob
  source: FeedbackImageSource
  filename?: string
}

export interface CaptureOptions {
  enabled?: boolean
  target?: HTMLElement | (() => HTMLElement | null) | null
  pixelRatio?: number
  quality?: number
  backgroundColor?: string | null
  cacheBust?: boolean
  filter?: (node: HTMLElement) => boolean
  captureFailure?: 'continue' | 'throw'
}

export interface UrlSanitizationOptions {
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
}

export interface FeedbackReporterCallbacks {
  onCaptureStart?: () => void
  onCaptureSuccess?: (blob: Blob) => void
  onCaptureError?: (error: unknown) => void
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
  capture?: CaptureOptions
  url?: UrlSanitizationOptions
  storage?: StorageOptions
  metadata?:
    | Record<string, unknown>
    | (() => Record<string, unknown> | Promise<Record<string, unknown>>)
  diagnostics?: DiagnosticsOptions
  callbacks?: FeedbackReporterCallbacks
}

export interface FeedbackReportOptions {
  message?: string
  attachments?: FeedbackAttachmentInput[]
  metadata?:
    | Record<string, unknown>
    | (() => Record<string, unknown> | Promise<Record<string, unknown>>)
  signal?: AbortSignal
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
  capture?: Record<string, unknown>
  application?: Record<string, unknown>
}
