import { createFeedbackReporter } from './reporter'
import type {
  FeedbackAttachmentInput,
  FeedbackReporterConfig,
  FeedbackSubmitResponse,
} from './types'

export function createAlpineFeedbackReporter(config?: FeedbackReporterConfig) {
  const reporter = createFeedbackReporter(config)

  return {
    reporter,
    message: '',
    attachments: [] as FeedbackAttachmentInput[],
    available: true,
    isSubmitting: false,
    isSuccess: false,
    errorMessage: null as string | null,
    lastResponse: null as FeedbackSubmitResponse | null,

    async init() {
      this.available = await reporter.isAvailable()
    },

    addAttachment(file: File | Blob, source: 'user_screenshot' | 'attachment' = 'attachment') {
      this.attachments.push({
        file,
        source,
      })
    },

    removeAttachment(index: number) {
      this.attachments.splice(index, 1)
    },

    clearAttachments() {
      this.attachments = []
    },

    async submit() {
      if (this.isSubmitting) return

      this.isSubmitting = true
      this.errorMessage = null
      this.isSuccess = false

      try {
        const response = await reporter.report({
          message: this.message,
          attachments: this.attachments,
        })
        this.lastResponse = response
        this.isSuccess = true
        this.message = ''
        this.clearAttachments()
        return response
      } catch (err) {
        this.errorMessage = err instanceof Error ? err.message : String(err)
        throw err
      } finally {
        this.isSubmitting = false
      }
    },
  }
}
