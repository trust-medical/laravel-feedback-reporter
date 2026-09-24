import { F as FeedbackReporterConfig, D as DiagnosticContext, e as FeedbackReportOptions, b as FeedbackSubmitResponse } from './types-C4xd_kpc.js';

declare class FeedbackReporter {
    private readonly config;
    private readonly activeDiagnostics;
    constructor(config?: FeedbackReporterConfig);
    initDiagnostics(): void;
    destroyDiagnostics(): void;
    isAvailable(signal?: AbortSignal): Promise<boolean>;
    collectContext(): Promise<DiagnosticContext>;
    submit(options: FeedbackReportOptions): Promise<FeedbackSubmitResponse>;
    report(options: FeedbackReportOptions): Promise<FeedbackSubmitResponse>;
}
declare function createFeedbackReporter(config?: FeedbackReporterConfig): FeedbackReporter;

export { FeedbackReporter as F, createFeedbackReporter as c };
