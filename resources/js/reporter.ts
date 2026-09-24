import { prepareAttachments } from './attachments'
import { collectDiagnosticContext } from './context'
import { breadcrumbsCollector } from './diagnostics/breadcrumbs'
import { consoleCollector } from './diagnostics/console'
import { errorCollector } from './diagnostics/errors'
import { networkErrorCollector } from './diagnostics/network'
import { AvailabilityError } from './errors'
import { checkAvailability, sendFeedbackReport } from './transport'
import type {
  DiagnosticContext,
  FeedbackReporterConfig,
  FeedbackReportOptions,
  FeedbackSubmitResponse,
} from './types'

export class FeedbackReporter {
  private readonly activeDiagnostics = new Set<'errors' | 'console' | 'network' | 'breadcrumbs'>()

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

    if (diag.errors && !this.activeDiagnostics.has('errors')) {
      const max = typeof diag.errors === 'object' ? diag.errors.maxEntries : 20
      errorCollector.init(max)
      this.activeDiagnostics.add('errors')
    }

    if (diag.console && !this.activeDiagnostics.has('console')) {
      const max = typeof diag.console === 'object' ? diag.console.maxEntries : 20
      consoleCollector.init(max)
      this.activeDiagnostics.add('console')
    }

    if (diag.network && !this.activeDiagnostics.has('network')) {
      const max = typeof diag.network === 'object' ? diag.network.maxEntries : 20
      networkErrorCollector.init(max)
      this.activeDiagnostics.add('network')
    }

    if (diag.breadcrumbs && !this.activeDiagnostics.has('breadcrumbs')) {
      const max = typeof diag.breadcrumbs === 'object' ? diag.breadcrumbs.maxEntries : 50
      breadcrumbsCollector.init(max)
      this.activeDiagnostics.add('breadcrumbs')
    }
  }

  public destroyDiagnostics(): void {
    if (this.activeDiagnostics.delete('errors')) errorCollector.destroy()
    if (this.activeDiagnostics.delete('console')) consoleCollector.destroy()
    if (this.activeDiagnostics.delete('network')) networkErrorCollector.destroy()
    if (this.activeDiagnostics.delete('breadcrumbs')) breadcrumbsCollector.destroy()
  }

  public async isAvailable(signal?: AbortSignal): Promise<boolean> {
    return checkAvailability(this.config, signal)
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
    formData.append('message', options.message)

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

  public async report(options: FeedbackReportOptions): Promise<FeedbackSubmitResponse> {
    const signal = options.signal

    // 1. Check availability
    const available = await this.isAvailable(signal)
    if (!available) {
      throw new AvailabilityError('Feedback reporter is currently unavailable.')
    }

    return this.submit(options)
  }
}

export function createFeedbackReporter(config?: FeedbackReporterConfig): FeedbackReporter {
  return new FeedbackReporter(config)
}
