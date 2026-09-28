import { prepareAttachments } from './attachments'
import { collectDiagnosticContext } from './context'
import { breadcrumbsCollector } from './diagnostics/breadcrumbs'
import { consoleCollector } from './diagnostics/console'
import { errorCollector } from './diagnostics/errors'
import { networkErrorCollector } from './diagnostics/network'
import { AvailabilityError, ValidationError } from './errors'
import { createId } from './id'
import { resolveLimits } from './limits'
import { fetchAvailability, sendFeedbackReport } from './transport'
import type {
  DiagnosticContext,
  FeedbackAvailability,
  FeedbackLimits,
  FeedbackReporterConfig,
  FeedbackReportOptions,
  FeedbackSubmitResponse,
} from './types'

const MAX_PAGE_TITLE_LENGTH = 255
const MAX_PAGE_URL_LENGTH = 2048

function jsonDepth(value: unknown, depth: number = 0): number {
  if (value === null || typeof value !== 'object') {
    return depth
  }

  let deepest = depth + 1
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    deepest = Math.max(deepest, jsonDepth(child, depth + 1))
  }

  return deepest
}

function byteLength(value: string): number {
  return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(value).length : value.length
}

export class FeedbackReporter {
  private readonly activeDiagnostics = new Set<'errors' | 'console' | 'network' | 'breadcrumbs'>()
  private serverLimits: FeedbackLimits | null = null

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

  /**
   * Return whether the reporter is available. Any failure is reported as `false`.
   */
  public async isAvailable(signal?: AbortSignal): Promise<boolean> {
    try {
      return (await this.getAvailability(signal)).available
    } catch (err) {
      if (signal?.aborted) {
        throw err
      }
      return false
    }
  }

  /**
   * Fetch availability and the server's limits. Rate limiting, timeouts, and network
   * failures are thrown as errors. The returned limits are reused by `submit()`.
   */
  public async getAvailability(signal?: AbortSignal): Promise<FeedbackAvailability> {
    const availability = await fetchAvailability(this.config, signal)
    if (availability.limits) {
      this.serverLimits = availability.limits
    }
    return availability
  }

  /** The limits last advertised by the server, or the package defaults. */
  public getLimits(): FeedbackLimits {
    return resolveLimits(this.serverLimits)
  }

  public async collectContext(): Promise<DiagnosticContext> {
    const ctx = await collectDiagnosticContext(this.config)
    this.config.callbacks?.onContextCollected?.(ctx as Record<string, unknown>)
    return ctx
  }

  public async submit(options: FeedbackReportOptions): Promise<FeedbackSubmitResponse> {
    this.config.callbacks?.onSubmitStart?.()

    try {
      const formData = await this.buildFormData(options)
      const response = await sendFeedbackReport(formData, this.config, options.signal)
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
    const availability = await this.getAvailability(signal)
    if (!availability.available) {
      // The server answered successfully that the reporter is not available.
      throw new AvailabilityError('Feedback reporter is currently unavailable.', 200)
    }

    return this.submit(options)
  }

  private async buildFormData(options: FeedbackReportOptions): Promise<FormData> {
    const limits = this.getLimits()
    const preparedAttachments = prepareAttachments(options.attachments || [], limits)

    const formData = new FormData()

    // 1. Client idempotency key (reuse it when retrying the same report)
    formData.append('client_report_id', options.clientReportId || createId())

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

    formData.append('metadata', this.encodeMetadata(finalMetadata, limits))

    // 5. Page context shortcuts for DB columns (truncated to the server's column limits)
    if (context.page) {
      if (context.page.url) {
        formData.append('page_url', String(context.page.url).slice(0, MAX_PAGE_URL_LENGTH))
      }
      if (context.page.title) {
        formData.append('page_title', String(context.page.title).slice(0, MAX_PAGE_TITLE_LENGTH))
      }
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

    return formData
  }

  /**
   * Serialize metadata and reject it before upload when it would exceed the server's
   * size or depth limits. statusCode 0 marks the error as a client-side check.
   */
  private encodeMetadata(metadata: Record<string, unknown>, limits: FeedbackLimits): string {
    const encoded = JSON.stringify(metadata)

    if (byteLength(encoded) > limits.maxMetadataBytes) {
      const message = `The metadata payload exceeds the maximum size of ${limits.maxMetadataBytes} bytes.`
      throw new ValidationError(message, { metadata: [message] }, 0)
    }

    if (jsonDepth(metadata) > limits.maxMetadataDepth) {
      const message = `The metadata must be no deeper than ${limits.maxMetadataDepth} levels.`
      throw new ValidationError(message, { metadata: [message] }, 0)
    }

    return encoded
  }
}

export function createFeedbackReporter(config?: FeedbackReporterConfig): FeedbackReporter {
  return new FeedbackReporter(config)
}
