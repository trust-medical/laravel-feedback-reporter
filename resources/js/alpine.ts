import { ValidationError } from './errors'
import { createId } from './id'
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
    /** `null` until `init()` has checked availability. */
    available: null as boolean | null,
    isSubmitting: false,
    isSuccess: false,
    errorMessage: null as string | null,
    /** Field errors from the last server validation failure, keyed by field name. */
    fieldErrors: {} as Record<string, string[]>,
    lastError: null as unknown,
    lastResponse: null as FeedbackSubmitResponse | null,
    /** Idempotency key for the current draft, reused on retry until it succeeds. */
    clientReportId: createId(),

    async init() {
      // Alpine injects $watch into component data; reset the success state once the user types again.
      const watch = (this as { $watch?: (key: string, callback: (value: unknown) => void) => void })
        .$watch
      watch?.call(this, 'message', (value) => {
        if (value) {
          this.isSuccess = false
        }
      })

      this.available = await reporter.isAvailable()
    },

    destroy() {
      reporter.destroyDiagnostics()
    },

    /** Call from input handlers so a previous success state does not linger while editing. */
    markEdited() {
      this.isSuccess = false
    },

    addAttachment(file: File | Blob, source: 'user_screenshot' | 'attachment' = 'attachment') {
      this.isSuccess = false
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

    /**
     * Submit the current draft. Errors are reflected in `errorMessage`, `fieldErrors`,
     * and `lastError` instead of being rethrown, so `@submit.prevent="submit"` does not
     * produce unhandled rejections. Resolves to the response, or `null` on failure.
     */
    async submit(): Promise<FeedbackSubmitResponse | null> {
      if (this.isSubmitting) return null

      this.isSubmitting = true
      this.errorMessage = null
      this.fieldErrors = {}
      this.lastError = null
      this.isSuccess = false

      try {
        const response = await reporter.report({
          message: this.message,
          attachments: this.attachments,
          clientReportId: this.clientReportId,
        })
        this.lastResponse = response
        this.isSuccess = true
        this.message = ''
        this.clearAttachments()
        this.clientReportId = createId()
        return response
      } catch (err) {
        this.lastError = err
        this.errorMessage = err instanceof Error ? err.message : String(err)
        if (err instanceof ValidationError) {
          this.fieldErrors = err.errors
        }
        return null
      } finally {
        this.isSubmitting = false
      }
    },
  }
}
