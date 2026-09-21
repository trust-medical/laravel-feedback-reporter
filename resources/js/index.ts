export {
  AttachmentValidationError,
  AvailabilityError,
  CaptureError,
  FeedbackReporterError,
  RateLimitError,
  ServerError,
  TransportError,
  ValidationError,
} from './errors'

export {
  createFeedbackReporter,
  FeedbackReporter,
} from './reporter'

export { captureScreenshot } from './capture'

export { collectDiagnosticContext } from './context'

export {
  sanitizeUrl,
  truncateString,
} from './sanitizer'

export { prepareAttachments } from './attachments'

export {
  checkAvailability,
  getCsrfToken,
  sendFeedbackReport,
} from './transport'

export { breadcrumbsCollector } from './diagnostics/breadcrumbs'

export { consoleCollector } from './diagnostics/console'

export { errorCollector } from './diagnostics/errors'

export { networkErrorCollector } from './diagnostics/network'

export { getNormalizedPerformance } from './diagnostics/performance'

export type {
  CaptureOptions,
  DiagnosticContext,
  DiagnosticsOptions,
  FeedbackAttachmentInput,
  FeedbackImageSource,
  FeedbackReporterCallbacks,
  FeedbackReporterConfig,
  FeedbackReportOptions,
  FeedbackSubmitResponse,
  StorageOptions,
  UrlSanitizationOptions,
} from './types'
