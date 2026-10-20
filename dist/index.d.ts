import { a as FeedbackImageSource, c as FeedbackReporterCallbacks, d as StorageOptions, f as UrlSanitizationOptions, i as FeedbackAvailability, l as FeedbackReporterConfig, n as DiagnosticsOptions, o as FeedbackLimits, r as FeedbackAttachmentInput, s as FeedbackReportOptions, t as DiagnosticContext, u as FeedbackSubmitResponse } from "./types-Bv_lx0RT.js";
import { n as createFeedbackReporter, t as FeedbackReporter } from "./reporter-CJ6ZYdDu.js";
//#region resources/js/attachments.d.ts
interface PreparedAttachment {
  file: File | Blob;
  source: string;
  filename: string;
}
type AttachmentLimits = Pick<FeedbackLimits, 'maxFiles' | 'maxFileSizeKb' | 'maxTotalSizeKb' | 'allowedMimes'>;
/**
 * Validate and normalize attachments before submission.
 *
 * Pass the server's limits (for example from `reporter.getAvailability()`) as the
 * second argument. The legacy `(attachments, maxFiles, maxFileSizeBytes)` signature
 * is still accepted.
 */
export declare function prepareAttachments(rawAttachments?: FeedbackAttachmentInput[], limitsOrMaxFiles?: Partial<AttachmentLimits> | number, legacyMaxFileSize?: number): PreparedAttachment[];
//#endregion
//#region resources/js/context.d.ts
export declare function collectDiagnosticContext(config?: FeedbackReporterConfig): Promise<DiagnosticContext>;
//#endregion
//#region resources/js/diagnostics/breadcrumbs.d.ts
interface BreadcrumbItem {
  category: 'click' | 'navigation' | 'submit';
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}
declare class BreadcrumbsCollector {
  private buffer;
  private maxEntries;
  private installed;
  private subscribers;
  private clickHandler;
  private submitHandler;
  private popstateHandler;
  init(maxEntries?: number): void;
  add(item: BreadcrumbItem): void;
  get(): BreadcrumbItem[];
  clear(): void;
  destroy(): void;
}
export declare const breadcrumbsCollector: BreadcrumbsCollector;
//#endregion
//#region resources/js/diagnostics/console.d.ts
interface CapturedConsoleItem {
  level: 'error' | 'warn';
  messages: string[];
  timestamp: string;
}
declare class ConsoleCollector {
  private buffer;
  private maxEntries;
  private installed;
  private subscribers;
  /**
   * Each installation gets a new version. A wrapper records only while its version is
   * active, so a wrapper left in place (because another library wrapped console after
   * it) passes calls through silently and a reinstall never records twice.
   */
  private activeVersion;
  private versionCounter;
  private wrappedError;
  private wrappedWarn;
  private originalError;
  private originalWarn;
  init(maxEntries?: number): void;
  private add;
  get(): CapturedConsoleItem[];
  clear(): void;
  destroy(): void;
}
export declare const consoleCollector: ConsoleCollector;
//#endregion
//#region resources/js/diagnostics/errors.d.ts
interface CapturedErrorItem {
  type: 'error' | 'unhandledrejection';
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  timestamp: string;
}
declare class ErrorCollector {
  private buffer;
  private maxEntries;
  private installed;
  private subscribers;
  private errorHandler;
  private rejectionHandler;
  init(maxEntries?: number): void;
  add(item: CapturedErrorItem): void;
  get(): CapturedErrorItem[];
  clear(): void;
  destroy(): void;
}
export declare const errorCollector: ErrorCollector;
//#endregion
//#region resources/js/diagnostics/network.d.ts
interface CapturedNetworkErrorItem {
  method: string;
  url: string;
  status: number | string;
  duration_ms?: number;
  timestamp: string;
}
declare class NetworkErrorCollector {
  private buffer;
  private maxEntries;
  private installed;
  private subscribers;
  /**
   * Each installation gets a new version. A wrapper records only while its version is
   * active, so a wrapper left in place (because another library wrapped fetch/XHR after
   * it) passes requests through silently and a reinstall never records twice.
   */
  private activeVersion;
  private versionCounter;
  private wrappedFetch;
  private wrappedXhrOpen;
  private wrappedXhrSend;
  private originalFetch;
  private originalXhrOpen;
  private originalXhrSend;
  init(maxEntries?: number): void;
  add(item: CapturedNetworkErrorItem): void;
  get(): CapturedNetworkErrorItem[];
  clear(): void;
  destroy(): void;
}
export declare const networkErrorCollector: NetworkErrorCollector;
//#endregion
//#region resources/js/diagnostics/performance.d.ts
export declare function getNormalizedPerformance(): Record<string, unknown> | null;
//#endregion
//#region resources/js/errors.d.ts
export declare class FeedbackReporterError extends Error {
  constructor(message: string);
}
export declare class AvailabilityError extends FeedbackReporterError {
  readonly statusCode: number;
  constructor(message?: string, statusCode?: number);
}
export declare class AttachmentValidationError extends FeedbackReporterError {
  constructor(message: string);
}
export declare class TransportError extends FeedbackReporterError {
  readonly statusCode?: number | undefined;
  readonly responseBody?: unknown | undefined;
  constructor(message: string, statusCode?: number | undefined, responseBody?: unknown | undefined);
}
export declare class ValidationError extends TransportError {
  readonly errors: Record<string, string[]>;
  constructor(message: string, errors?: Record<string, string[]>, statusCode?: number);
}
export declare class RateLimitError extends TransportError {
  constructor(message?: string, statusCode?: number);
}
export declare class ServerError extends TransportError {
  constructor(message?: string, statusCode?: number);
}
export declare class SessionExpiredError extends TransportError {
  constructor(message?: string, statusCode?: number);
}
export declare class PayloadTooLargeError extends TransportError {
  constructor(message?: string, statusCode?: number);
}
export declare class TimeoutError extends TransportError {
  readonly timeoutMs: number;
  constructor(timeoutMs: number);
}
//#endregion
//#region resources/js/id.d.ts
/**
 * Generate a random identifier that matches the server's client_report_id
 * format (`^[A-Za-z0-9_-]{8,64}$`).
 *
 * `crypto.randomUUID` only exists in secure contexts (HTTPS or localhost),
 * so plain-HTTP environments such as internal staging hosts fall back to
 * `crypto.getRandomValues` or, as a last resort, `Math.random`.
 */
export declare function createId(): string;
//#endregion
//#region resources/js/limits.d.ts
export declare const DEFAULT_LIMITS: Readonly<FeedbackLimits>;
//#endregion
//#region resources/js/sanitizer.d.ts
export declare function sanitizeUrl(rawUrl: string, options?: UrlSanitizationOptions): string;
export declare function truncateString(val: string, maxLength?: number): string;
/**
 * Replace every absolute URL inside free text (for example a stack trace) with its
 * sanitized form so query strings and fragments are not leaked.
 */
export declare function sanitizeUrlsInText(text: string, options?: UrlSanitizationOptions): string;
/**
 * Serialize an arbitrary value into a bounded string without walking huge objects.
 * Depth, key count, array length, and total output length are all capped.
 */
export declare function safeStringify(value: unknown, maxLength?: number): string;
//#endregion
//#region resources/js/transport.d.ts
export declare const DEFAULT_TIMEOUT_MS = 60000;
export declare function getCsrfToken(config?: FeedbackReporterConfig): string | null;
/**
 * Fetch the availability state and the server's advertised limits.
 *
 * Unlike `checkAvailability`, this surfaces rate limiting, timeouts, and network
 * failures as errors so callers can tell them apart from "unavailable".
 */
export declare function fetchAvailability(config?: FeedbackReporterConfig, signal?: AbortSignal): Promise<FeedbackAvailability>;
/**
 * Return whether the reporter is available. Any failure is reported as `false`.
 */
export declare function checkAvailability(config?: FeedbackReporterConfig, signal?: AbortSignal): Promise<boolean>;
export declare function sendFeedbackReport(formData: FormData, config?: FeedbackReporterConfig, signal?: AbortSignal): Promise<FeedbackSubmitResponse>;
//#endregion
export { type AttachmentLimits, type DiagnosticContext, type DiagnosticsOptions, type FeedbackAttachmentInput, type FeedbackAvailability, type FeedbackImageSource, type FeedbackLimits, type FeedbackReportOptions, FeedbackReporter, type FeedbackReporterCallbacks, type FeedbackReporterConfig, type FeedbackSubmitResponse, type PreparedAttachment, type StorageOptions, type UrlSanitizationOptions, createFeedbackReporter };
//# sourceMappingURL=index.d.ts.map