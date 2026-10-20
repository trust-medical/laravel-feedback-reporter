import { l as FeedbackReporterConfig, r as FeedbackAttachmentInput, u as FeedbackSubmitResponse } from "./types-Bv_lx0RT.js";
import { t as FeedbackReporter } from "./reporter-CJ6ZYdDu.js";
//#region resources/js/alpine.d.ts
export declare function createAlpineFeedbackReporter(config?: FeedbackReporterConfig): {
  reporter: FeedbackReporter;
  message: string;
  attachments: FeedbackAttachmentInput[];
  /** `null` until `init()` has checked availability. */
  available: boolean | null;
  isSubmitting: boolean;
  isSuccess: boolean;
  errorMessage: string | null;
  /** Field errors from the last server validation failure, keyed by field name. */
  fieldErrors: Record<string, string[]>;
  lastError: unknown;
  lastResponse: FeedbackSubmitResponse | null;
  /** Idempotency key for the current draft, reused on retry until it succeeds. */
  clientReportId: string;
  init(): Promise<void>;
  destroy(): void;
  /** Call from input handlers so a previous success state does not linger while editing. */
  markEdited(): void;
  addAttachment(file: File | Blob, source?: "user_screenshot" | "attachment"): void;
  removeAttachment(index: number): void;
  clearAttachments(): void;
  /**
   * Submit the current draft. Errors are reflected in `errorMessage`, `fieldErrors`,
   * and `lastError` instead of being rethrown, so `@submit.prevent="submit"` does not
   * produce unhandled rejections. Resolves to the response, or `null` on failure.
   */
  submit(): Promise<FeedbackSubmitResponse | null>;
};
//#endregion
//# sourceMappingURL=alpine.d.ts.map