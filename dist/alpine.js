import { createFeedbackReporter } from './chunk-YPL5YMV7.js';

// resources/js/alpine.ts
function createAlpineFeedbackReporter(config) {
  const reporter = createFeedbackReporter(config);
  return {
    reporter,
    message: "",
    attachments: [],
    available: true,
    isSubmitting: false,
    isSuccess: false,
    errorMessage: null,
    lastResponse: null,
    async init() {
      this.available = await reporter.isAvailable();
    },
    addAttachment(file, source = "attachment") {
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
    async submit() {
      if (this.isSubmitting) return;
      this.isSubmitting = true;
      this.errorMessage = null;
      this.isSuccess = false;
      try {
        const response = await reporter.report({
          message: this.message,
          attachments: this.attachments
        });
        this.lastResponse = response;
        this.isSuccess = true;
        this.message = "";
        this.clearAttachments();
        return response;
      } catch (err) {
        this.errorMessage = err instanceof Error ? err.message : String(err);
        throw err;
      } finally {
        this.isSubmitting = false;
      }
    }
  };
}

export { createAlpineFeedbackReporter };
//# sourceMappingURL=alpine.js.map
//# sourceMappingURL=alpine.js.map