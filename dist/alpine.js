import { createFeedbackReporter, createId, ValidationError } from './chunk-OZ33U26D.js';

// resources/js/alpine.ts
function createAlpineFeedbackReporter(config) {
  const reporter = createFeedbackReporter(config);
  return {
    reporter,
    message: "",
    attachments: [],
    /** `null` until `init()` has checked availability. */
    available: null,
    isSubmitting: false,
    isSuccess: false,
    errorMessage: null,
    /** Field errors from the last server validation failure, keyed by field name. */
    fieldErrors: {},
    lastError: null,
    lastResponse: null,
    /** Idempotency key for the current draft, reused on retry until it succeeds. */
    clientReportId: createId(),
    async init() {
      const watch = this.$watch;
      watch?.call(this, "message", (value) => {
        if (value) {
          this.isSuccess = false;
        }
      });
      this.available = await reporter.isAvailable();
    },
    destroy() {
      reporter.destroyDiagnostics();
    },
    /** Call from input handlers so a previous success state does not linger while editing. */
    markEdited() {
      this.isSuccess = false;
    },
    addAttachment(file, source = "attachment") {
      this.isSuccess = false;
      this.attachments.push({
        file,
        source
      });
    },
    removeAttachment(index) {
      this.attachments.splice(index, 1);
    },
    clearAttachments() {
      this.attachments = [];
    },
    /**
     * Submit the current draft. Errors are reflected in `errorMessage`, `fieldErrors`,
     * and `lastError` instead of being rethrown, so `@submit.prevent="submit"` does not
     * produce unhandled rejections. Resolves to the response, or `null` on failure.
     */
    async submit() {
      if (this.isSubmitting) return null;
      this.isSubmitting = true;
      this.errorMessage = null;
      this.fieldErrors = {};
      this.lastError = null;
      this.isSuccess = false;
      try {
        const response = await reporter.report({
          message: this.message,
          attachments: this.attachments,
          clientReportId: this.clientReportId
        });
        this.lastResponse = response;
        this.isSuccess = true;
        this.message = "";
        this.clearAttachments();
        this.clientReportId = createId();
        return response;
      } catch (err) {
        this.lastError = err;
        this.errorMessage = err instanceof Error ? err.message : String(err);
        if (err instanceof ValidationError) {
          this.fieldErrors = err.errors;
        }
        return null;
      } finally {
        this.isSubmitting = false;
      }
    }
  };
}

export { createAlpineFeedbackReporter };
//# sourceMappingURL=alpine.js.map
//# sourceMappingURL=alpine.js.map