import { F as FeedbackReporterConfig, d as FeedbackAvailability, c as FeedbackLimits, D as DiagnosticContext, g as FeedbackReportOptions, b as FeedbackSubmitResponse } from './types-BQIS2TNQ.js';

declare class FeedbackReporter {
    private readonly config;
    private readonly activeDiagnostics;
    private serverLimits;
    constructor(config?: FeedbackReporterConfig);
    initDiagnostics(): void;
    destroyDiagnostics(): void;
    /**
     * Return whether the reporter is available. Any failure is reported as `false`.
     */
    isAvailable(signal?: AbortSignal): Promise<boolean>;
    /**
     * Fetch availability and the server's limits. Rate limiting, timeouts, and network
     * failures are thrown as errors. The returned limits are reused by `submit()`.
     */
    getAvailability(signal?: AbortSignal): Promise<FeedbackAvailability>;
    /** The limits last advertised by the server, or the package defaults. */
    getLimits(): FeedbackLimits;
    collectContext(): Promise<DiagnosticContext>;
    submit(options: FeedbackReportOptions): Promise<FeedbackSubmitResponse>;
    report(options: FeedbackReportOptions): Promise<FeedbackSubmitResponse>;
    private buildFormData;
    /**
     * Serialize metadata and reject it before upload when it would exceed the server's
     * size or depth limits. statusCode 0 marks the error as a client-side check.
     */
    private encodeMetadata;
}
declare function createFeedbackReporter(config?: FeedbackReporterConfig): FeedbackReporter;

export { FeedbackReporter as F, createFeedbackReporter as c };
