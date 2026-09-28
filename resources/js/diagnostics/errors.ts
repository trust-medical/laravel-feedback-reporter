import { sanitizeUrl, sanitizeUrlsInText, truncateString } from '../sanitizer'
import { normalizeMaxEntries } from './buffer'

export interface CapturedErrorItem {
  type: 'error' | 'unhandledrejection'
  message: string
  source?: string
  lineno?: number
  colno?: number
  stack?: string
  timestamp: string
}

class ErrorCollector {
  private buffer: CapturedErrorItem[] = []
  private maxEntries: number = 20
  private installed: boolean = false
  private subscribers: number = 0
  private errorHandler: ((event: ErrorEvent) => void) | null = null
  private rejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null

  public init(maxEntries: number = 20): void {
    if (typeof window === 'undefined') {
      return
    }
    if (this.installed) {
      this.subscribers += 1
      return
    }

    this.maxEntries = normalizeMaxEntries(maxEntries, 20)
    this.installed = true
    this.subscribers = 1

    this.errorHandler = (event: ErrorEvent) => {
      this.add({
        type: 'error',
        message: truncateString(event.message, 500),
        source: event.filename ? truncateString(sanitizeUrl(event.filename), 255) : undefined,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
          ? truncateString(sanitizeUrlsInText(String(event.error.stack)), 2000)
          : undefined,
        timestamp: new Date().toISOString(),
      })
    }
    window.addEventListener('error', this.errorHandler)

    this.rejectionHandler = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message = reason instanceof Error ? reason.message : String(reason)
      const stack =
        reason instanceof Error && reason.stack
          ? truncateString(sanitizeUrlsInText(reason.stack), 2000)
          : undefined

      this.add({
        type: 'unhandledrejection',
        message: truncateString(message, 500),
        stack,
        timestamp: new Date().toISOString(),
      })
    }

    window.addEventListener('unhandledrejection', this.rejectionHandler)
  }

  public add(item: CapturedErrorItem): void {
    this.buffer.push(item)
    if (this.buffer.length > this.maxEntries) {
      this.buffer.shift()
    }
  }

  public get(): CapturedErrorItem[] {
    return [...this.buffer]
  }

  public clear(): void {
    this.buffer = []
  }

  public destroy(): void {
    if (!this.installed || typeof window === 'undefined') {
      return
    }

    if (this.subscribers > 1) {
      this.subscribers -= 1
      return
    }

    if (this.errorHandler) {
      window.removeEventListener('error', this.errorHandler)
    }
    if (this.rejectionHandler) {
      window.removeEventListener('unhandledrejection', this.rejectionHandler)
    }

    this.buffer = []
    this.installed = false
    this.subscribers = 0
    this.errorHandler = null
    this.rejectionHandler = null
  }
}

export const errorCollector = new ErrorCollector()
