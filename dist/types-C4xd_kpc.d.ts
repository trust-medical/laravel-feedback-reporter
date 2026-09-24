type FeedbackImageSource = 'user_screenshot' | 'attachment';
interface FeedbackAttachmentInput {
    file: File | Blob;
    source: FeedbackImageSource;
    filename?: string;
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
    url?: UrlSanitizationOptions;
    storage?: StorageOptions;
    metadata?: Record<string, unknown> | (() => Record<string, unknown> | Promise<Record<string, unknown>>);
    diagnostics?: DiagnosticsOptions;
    callbacks?: FeedbackReporterCallbacks;
}
interface FeedbackReportOptions {
    message: string;
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
    application?: Record<string, unknown>;
}

export type { DiagnosticContext as D, FeedbackReporterConfig as F, StorageOptions as S, UrlSanitizationOptions as U, FeedbackAttachmentInput as a, FeedbackSubmitResponse as b, DiagnosticsOptions as c, FeedbackImageSource as d, FeedbackReportOptions as e, FeedbackReporterCallbacks as f };
