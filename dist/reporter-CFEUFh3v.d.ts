type FeedbackImageSource = 'automatic_capture' | 'user_screenshot' | 'attachment';
interface FeedbackAttachmentInput {
    file: File | Blob;
    source: FeedbackImageSource;
    filename?: string;
}
interface CaptureOptions {
    enabled?: boolean;
    target?: HTMLElement | (() => HTMLElement | null) | null;
    pixelRatio?: number;
    quality?: number;
    backgroundColor?: string | null;
    cacheBust?: boolean;
    filter?: (node: HTMLElement) => boolean;
    captureFailure?: 'continue' | 'throw';
}
interface UrlSanitizationOptions {
    query?: {
        mode: 'exclude' | 'allowlist';
        keys?: string[];
    };
    hash?: boolean;
}
interface StorageOptions {
    localStorageKeys?: string[];
    sessionStorageKeys?: string[];
}
interface DiagnosticsOptions {
    errors?: boolean | {
        maxEntries?: number;
    };
    console?: boolean | {
        maxEntries?: number;
    };
    network?: boolean | {
        maxEntries?: number;
    };
    breadcrumbs?: boolean | {
        maxEntries?: number;
    };
    performance?: boolean;
}
interface FeedbackSubmitResponse {
    id: string;
    success: boolean;
}
interface FeedbackReporterCallbacks {
    onCaptureStart?: () => void;
    onCaptureSuccess?: (blob: Blob) => void;
    onCaptureError?: (error: unknown) => void;
    onContextCollected?: (context: Record<string, unknown>) => void;
    onSubmitStart?: () => void;
    onSubmitSuccess?: (response: FeedbackSubmitResponse) => void;
    onSubmitError?: (error: unknown) => void;
}
interface FeedbackReporterConfig {
    endpoint?: string;
    availabilityEndpoint?: string;
    csrfToken?: string | (() => string | null);
    headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
    capture?: CaptureOptions;
    url?: UrlSanitizationOptions;
    storage?: StorageOptions;
    metadata?: Record<string, unknown> | (() => Record<string, unknown> | Promise<Record<string, unknown>>);
    diagnostics?: DiagnosticsOptions;
    callbacks?: FeedbackReporterCallbacks;
}
interface FeedbackReportOptions {
    message?: string;
    attachments?: FeedbackAttachmentInput[];
    metadata?: Record<string, unknown> | (() => Record<string, unknown> | Promise<Record<string, unknown>>);
    signal?: AbortSignal;
}
interface DiagnosticContext {
    page?: Record<string, unknown>;
    viewport?: Record<string, unknown>;
    screen?: Record<string, unknown>;
    browser?: Record<string, unknown>;
    network?: Record<string, unknown>;
    performance?: Record<string, unknown>;
    active_element?: Record<string, unknown>;
    storage?: Record<string, unknown>;
    errors?: unknown[];
    console?: unknown[];
    network_errors?: unknown[];
    breadcrumbs?: unknown[];
    capture?: Record<string, unknown>;
    application?: Record<string, unknown>;
}

declare class FeedbackReporter {
    private readonly config;
    constructor(config?: FeedbackReporterConfig);
    initDiagnostics(): void;
    destroyDiagnostics(): void;
    isAvailable(signal?: AbortSignal): Promise<boolean>;
    capture(options?: CaptureOptions): Promise<Blob>;
    collectContext(): Promise<DiagnosticContext>;
    submit(options: FeedbackReportOptions): Promise<FeedbackSubmitResponse>;
    report(options?: FeedbackReportOptions): Promise<FeedbackSubmitResponse>;
}
declare function createFeedbackReporter(config?: FeedbackReporterConfig): FeedbackReporter;

export { type CaptureOptions as C, type DiagnosticContext as D, type FeedbackReporterConfig as F, type StorageOptions as S, type UrlSanitizationOptions as U, FeedbackReporter as a, type FeedbackAttachmentInput as b, type FeedbackSubmitResponse as c, type DiagnosticsOptions as d, type FeedbackImageSource as e, type FeedbackReportOptions as f, type FeedbackReporterCallbacks as g, createFeedbackReporter as h };
