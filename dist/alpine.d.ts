import { F as FeedbackReporterConfig, a as FeedbackReporter, b as FeedbackAttachmentInput, c as FeedbackSubmitResponse } from './reporter-CFEUFh3v.js';

declare function createAlpineFeedbackReporter(config?: FeedbackReporterConfig): {
    reporter: FeedbackReporter;
    message: string;
    attachments: FeedbackAttachmentInput[];
    available: boolean;
    isSubmitting: boolean;
    isSuccess: boolean;
    errorMessage: string | null;
    lastResponse: FeedbackSubmitResponse | null;
    init(): Promise<void>;
    addAttachment(file: File | Blob, source?: "user_screenshot" | "attachment"): void;
    removeAttachment(index: number): void;
    clearAttachments(): void;
    submit(): Promise<FeedbackSubmitResponse | undefined>;
};

export { createAlpineFeedbackReporter };
