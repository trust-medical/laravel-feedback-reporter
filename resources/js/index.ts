export { prepareAttachments } from './attachments'
export { collectDiagnosticContext } from './context'
export { breadcrumbsCollector } from './diagnostics/breadcrumbs'
export { consoleCollector } from './diagnostics/console'
export { errorCollector } from './diagnostics/errors'
export { networkErrorCollector } from './diagnostics/network'
export { getNormalizedPerformance } from './diagnostics/performance'
export {
  AttachmentValidationError,
  AvailabilityError,
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
export {
  sanitizeUrl,
  truncateString,
} from './sanitizer'
export {
  checkAvailability,
  getCsrfToken,
  sendFeedbackReport,
} from './transport'

export type {
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
