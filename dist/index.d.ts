import { a as FeedbackAttachmentInput, F as FeedbackReporterConfig, D as DiagnosticContext, U as UrlSanitizationOptions, b as FeedbackSubmitResponse } from './types-C4xd_kpc.js';
export { c as DiagnosticsOptions, d as FeedbackImageSource, e as FeedbackReportOptions, f as FeedbackReporterCallbacks, S as StorageOptions } from './types-C4xd_kpc.js';
export { F as FeedbackReporter, c as createFeedbackReporter } from './reporter-Cp5XjEr6.js';

interface PreparedAttachment {
    file: File | Blob;
    source: string;
    filename: string;
}
declare function prepareAttachments(rawAttachments?: FeedbackAttachmentInput[], maxFiles?: number, maxFileSize?: number): PreparedAttachment[];

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

declare function sanitizeUrl(rawUrl: string, options?: UrlSanitizationOptions): string;
declare function truncateString(val: string, maxLength?: number): string;

declare function getCsrfToken(config?: FeedbackReporterConfig): string | null;
declare function checkAvailability(config?: FeedbackReporterConfig, signal?: AbortSignal): Promise<boolean>;
declare function sendFeedbackReport(formData: FormData, config?: FeedbackReporterConfig, signal?: AbortSignal): Promise<FeedbackSubmitResponse>;

export { AttachmentValidationError, AvailabilityError, DiagnosticContext, FeedbackAttachmentInput, FeedbackReporterConfig, FeedbackReporterError, FeedbackSubmitResponse, RateLimitError, ServerError, TransportError, UrlSanitizationOptions, ValidationError, breadcrumbsCollector, checkAvailability, collectDiagnosticContext, consoleCollector, errorCollector, getCsrfToken, getNormalizedPerformance, networkErrorCollector, prepareAttachments, sanitizeUrl, sendFeedbackReport, truncateString };
