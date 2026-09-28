export type { AttachmentLimits, PreparedAttachment } from './attachments'
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
  PayloadTooLargeError,
  RateLimitError,
  ServerError,
  SessionExpiredError,
  TimeoutError,
  TransportError,
  ValidationError,
} from './errors'
export { createId } from './id'
export { DEFAULT_LIMITS } from './limits'
export {
  createFeedbackReporter,
  FeedbackReporter,
} from './reporter'
export {
  safeStringify,
  sanitizeUrl,
  sanitizeUrlsInText,
  truncateString,
} from './sanitizer'
export {
  checkAvailability,
  DEFAULT_TIMEOUT_MS,
  fetchAvailability,
  getCsrfToken,
  sendFeedbackReport,
} from './transport'

export type {
  DiagnosticContext,
  DiagnosticsOptions,
  FeedbackAttachmentInput,
  FeedbackAvailability,
  FeedbackImageSource,
  FeedbackLimits,
  FeedbackReporterCallbacks,
  FeedbackReporterConfig,
  FeedbackReportOptions,
  FeedbackSubmitResponse,
  StorageOptions,
  UrlSanitizationOptions,
} from './types'
