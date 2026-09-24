import { F as FeedbackReporter } from './reporter-Cp5XjEr6.js';
import { F as FeedbackReporterConfig, a as FeedbackAttachmentInput, b as FeedbackSubmitResponse } from './types-C4xd_kpc.js';

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
