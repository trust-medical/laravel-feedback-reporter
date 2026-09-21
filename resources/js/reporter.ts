import { prepareAttachments } from './attachments'
import { captureScreenshot } from './capture'
import { collectDiagnosticContext } from './context'
import { breadcrumbsCollector } from './diagnostics/breadcrumbs'
import { consoleCollector } from './diagnostics/console'
import { errorCollector } from './diagnostics/errors'
import { networkErrorCollector } from './diagnostics/network'
import { AvailabilityError, CaptureError } from './errors'
import { checkAvailability, sendFeedbackReport } from './transport'
import type {
  CaptureOptions,
  DiagnosticContext,
  FeedbackAttachmentInput,
  FeedbackReportOptions,
  FeedbackReporterConfig,
  FeedbackSubmitResponse,
} from './types'

export class FeedbackReporter {
  constructor(private readonly config: FeedbackReporterConfig = {}) {
    if (this.config.diagnostics) {
      this.initDiagnostics()
    }
  }

  public initDiagnostics(): void {
    const diag = this.config.diagnostics
    if (!diag) {
      return
    }

    if (diag.errors !== false) {
      const max = typeof diag.errors === 'object' ? diag.errors.maxEntries : 20
      errorCollector.init(max)
    }

    if (diag.console) {
      const max = typeof diag.console === 'object' ? diag.console.maxEntries : 20
      consoleCollector.init(max)
    }

    if (diag.network) {
      const max = typeof diag.network === 'object' ? diag.network.maxEntries : 20
      networkErrorCollector.init(max)
    }

    if (diag.breadcrumbs) {
      const max = typeof diag.breadcrumbs === 'object' ? diag.breadcrumbs.maxEntries : 50
      breadcrumbsCollector.init(max)
    }
  }

  public destroyDiagnostics(): void {
    errorCollector.destroy()
    consoleCollector.destroy()
    networkErrorCollector.destroy()
    breadcrumbsCollector.destroy()
  }

  public async isAvailable(signal?: AbortSignal): Promise<boolean> {
    return checkAvailability(this.config, signal)
  }

  public async capture(options?: CaptureOptions): Promise<Blob> {
    const merged = { ...this.config.capture, ...options }
    this.config.callbacks?.onCaptureStart?.()

    try {
      const blob = await captureScreenshot(merged)
      this.config.callbacks?.onCaptureSuccess?.(blob)
      return blob
    } catch (err) {
      this.config.callbacks?.onCaptureError?.(err)
      throw err
    }
  }

  public async collectContext(): Promise<DiagnosticContext> {
    const ctx = await collectDiagnosticContext(this.config)
    this.config.callbacks?.onContextCollected?.(ctx as Record<string, unknown>)
    return ctx
  }

  public async submit(options: FeedbackReportOptions): Promise<FeedbackSubmitResponse> {
    const signal = options.signal
    const attachments = options.attachments || []

    const preparedAttachments = prepareAttachments(attachments)

    const formData = new FormData()

    // 1. Client idempotency key
    const clientReportId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    formData.append('client_report_id', clientReportId)

    // 2. Message
    if (options.message) {
      formData.append('message', options.message)
    }

    // 3. Attachments
    preparedAttachments.forEach((att, index) => {
      formData.append(`attachments[${index}][file]`, att.file, att.filename)
      formData.append(`attachments[${index}][source]`, att.source)
    })

    // 4. Context & Metadata
    const context = await this.collectContext()

    let customMeta: Record<string, unknown> | undefined
    if (options.metadata) {
      customMeta =
        typeof options.metadata === 'function' ? await options.metadata() : options.metadata
    }

    const finalMetadata: Record<string, unknown> = {
      ...context,
      ...(customMeta ? { report_metadata: customMeta } : {}),
    }

    formData.append('metadata', JSON.stringify(finalMetadata))

    // 5. Page context shortcuts for DB columns
    if (context.page) {
      if (context.page.url) formData.append('page_url', String(context.page.url))
      if (context.page.title) formData.append('page_title', String(context.page.title))
    }
    if (context.viewport) {
      if (context.viewport.viewport_width !== undefined)
        formData.append('viewport_width', String(context.viewport.viewport_width))
      if (context.viewport.viewport_height !== undefined)
        formData.append('viewport_height', String(context.viewport.viewport_height))
    }
    if (context.screen) {
      if (context.screen.screen_width !== undefined)
        formData.append('screen_width', String(context.screen.screen_width))
      if (context.screen.screen_height !== undefined)
        formData.append('screen_height', String(context.screen.screen_height))
    }
    if (context.browser) {
      if (context.browser.language) formData.append('locale', String(context.browser.language))
    }
    try {
      formData.append('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone)
    } catch {
      // Ignore
    }

    // 6. Send
    this.config.callbacks?.onSubmitStart?.()
    try {
      const response = await sendFeedbackReport(formData, this.config, signal)
      this.config.callbacks?.onSubmitSuccess?.(response)
      return response
    } catch (err) {
      this.config.callbacks?.onSubmitError?.(err)
      throw err
    }
  }

  public async report(options: FeedbackReportOptions = {}): Promise<FeedbackSubmitResponse> {
    const signal = options.signal

    // 1. Check availability
    const available = await this.isAvailable(signal)
    if (!available) {
      throw new AvailabilityError('Feedback reporter is currently unavailable.')
    }

    const attachments: FeedbackAttachmentInput[] = [...(options.attachments || [])]
    const captureOpts = { ...this.config.capture }
    let captureMetadata: Record<string, unknown> = { attempted: false }

    // 2. Automatic Capture
    if (captureOpts.enabled !== false) {
      captureMetadata = { attempted: true }
      try {
        const screenshotBlob = await this.capture(captureOpts)
        attachments.unshift({
          file: screenshotBlob,
          source: 'automatic_capture',
        })
        captureMetadata.success = true
      } catch (err) {
        captureMetadata.success = false
        captureMetadata.error_type = err instanceof CaptureError ? 'CaptureError' : 'UnknownError'

        if (captureOpts.captureFailure === 'throw') {
          throw err
        }
        // When 'continue', proceed with user attachments / message
      }
    }

    // Merge captureMetadata into options
    const reportOptions: FeedbackReportOptions = {
      ...options,
      attachments,
      metadata: async () => {
        const existingMeta =
          typeof options.metadata === 'function' ? await options.metadata() : options.metadata || {}
        return {
          ...existingMeta,
          capture: captureMetadata,
        }
      },
    }

    // 3. Submit
    return this.submit(reportOptions)
  }
}

export function createFeedbackReporter(config?: FeedbackReporterConfig): FeedbackReporter {
  return new FeedbackReporter(config)
}
