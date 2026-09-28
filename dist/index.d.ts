import { c as FeedbackLimits, a as FeedbackAttachmentInput, F as FeedbackReporterConfig, D as DiagnosticContext, U as UrlSanitizationOptions, d as FeedbackAvailability, b as FeedbackSubmitResponse } from './types-BQIS2TNQ.js';
export { e as DiagnosticsOptions, f as FeedbackImageSource, g as FeedbackReportOptions, h as FeedbackReporterCallbacks, S as StorageOptions } from './types-BQIS2TNQ.js';
export { F as FeedbackReporter, c as createFeedbackReporter } from './reporter-g6HxxY_-.js';

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
declare function prepareAttachments(rawAttachments?: FeedbackAttachmentInput[], limitsOrMaxFiles?: Partial<AttachmentLimits> | number, legacyMaxFileSize?: number): PreparedAttachment[];

declare function collectDiagnosticContext(config?: FeedbackReporterConfig): Promise<DiagnosticContext>;

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
declare const breadcrumbsCollector: BreadcrumbsCollector;

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
declare const consoleCollector: ConsoleCollector;

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
declare const errorCollector: ErrorCollector;

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
declare const networkErrorCollector: NetworkErrorCollector;

declare function getNormalizedPerformance(): Record<string, unknown> | null;

declare class FeedbackReporterError extends Error {
    constructor(message: string);
}
declare class AvailabilityError extends FeedbackReporterError {
    readonly statusCode: number;
    constructor(message?: string, statusCode?: number);
}
declare class AttachmentValidationError extends FeedbackReporterError {
    constructor(message: string);
}
declare class TransportError extends FeedbackReporterError {
    readonly statusCode?: number | undefined;
    readonly responseBody?: unknown | undefined;
    constructor(message: string, statusCode?: number | undefined, responseBody?: unknown | undefined);
}
declare class ValidationError extends TransportError {
    readonly errors: Record<string, string[]>;
    constructor(message: string, errors?: Record<string, string[]>, statusCode?: number);
}
declare class RateLimitError extends TransportError {
    constructor(message?: string, statusCode?: number);
}
declare class ServerError extends TransportError {
    constructor(message?: string, statusCode?: number);
}
declare class SessionExpiredError extends TransportError {
    constructor(message?: string, statusCode?: number);
}
declare class PayloadTooLargeError extends TransportError {
    constructor(message?: string, statusCode?: number);
}
declare class TimeoutError extends TransportError {
    readonly timeoutMs: number;
    constructor(timeoutMs: number);
}

/**
 * Generate a random identifier that matches the server's client_report_id
 * format (`^[A-Za-z0-9_-]{8,64}$`).
 *
 * `crypto.randomUUID` only exists in secure contexts (HTTPS or localhost),
 * so plain-HTTP environments such as internal staging hosts fall back to
 * `crypto.getRandomValues` or, as a last resort, `Math.random`.
 */
declare function createId(): string;

declare const DEFAULT_LIMITS: Readonly<FeedbackLimits>;

declare function sanitizeUrl(rawUrl: string, options?: UrlSanitizationOptions): string;
declare function truncateString(val: string, maxLength?: number): string;
/**
 * Replace every absolute URL inside free text (for example a stack trace) with its
 * sanitized form so query strings and fragments are not leaked.
 */
declare function sanitizeUrlsInText(text: string, options?: UrlSanitizationOptions): string;
/**
 * Serialize an arbitrary value into a bounded string without walking huge objects.
 * Depth, key count, array length, and total output length are all capped.
 */
declare function safeStringify(value: unknown, maxLength?: number): string;

declare const DEFAULT_TIMEOUT_MS = 60000;
declare function getCsrfToken(config?: FeedbackReporterConfig): string | null;
/**
 * Fetch the availability state and the server's advertised limits.
 *
 * Unlike `checkAvailability`, this surfaces rate limiting, timeouts, and network
 * failures as errors so callers can tell them apart from "unavailable".
 */
declare function fetchAvailability(config?: FeedbackReporterConfig, signal?: AbortSignal): Promise<FeedbackAvailability>;
/**
 * Return whether the reporter is available. Any failure is reported as `false`.
 */
declare function checkAvailability(config?: FeedbackReporterConfig, signal?: AbortSignal): Promise<boolean>;
declare function sendFeedbackReport(formData: FormData, config?: FeedbackReporterConfig, signal?: AbortSignal): Promise<FeedbackSubmitResponse>;

export { type AttachmentLimits, AttachmentValidationError, AvailabilityError, DEFAULT_LIMITS, DEFAULT_TIMEOUT_MS, DiagnosticContext, FeedbackAttachmentInput, FeedbackAvailability, FeedbackLimits, FeedbackReporterConfig, FeedbackReporterError, FeedbackSubmitResponse, PayloadTooLargeError, type PreparedAttachment, RateLimitError, ServerError, SessionExpiredError, TimeoutError, TransportError, UrlSanitizationOptions, ValidationError, breadcrumbsCollector, checkAvailability, collectDiagnosticContext, consoleCollector, createId, errorCollector, fetchAvailability, getCsrfToken, getNormalizedPerformance, networkErrorCollector, prepareAttachments, safeStringify, sanitizeUrl, sanitizeUrlsInText, sendFeedbackReport, truncateString };
