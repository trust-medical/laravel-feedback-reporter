import { truncateString } from '../sanitizer'

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
  private originalOnError: typeof window.onerror | null = null
  private rejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null

  public init(maxEntries: number = 20): void {
    if (this.installed || typeof window === 'undefined') {
      return
    }

    this.maxEntries = maxEntries
    this.installed = true

    this.originalOnError = window.onerror
    window.onerror = (message, source, lineno, colno, error) => {
      this.add({
        type: 'error',
        message: truncateString(String(message), 500),
        source: source ? truncateString(String(source), 255) : undefined,
        lineno,
        colno,
        stack: error?.stack ? truncateString(error.stack, 2000) : undefined,
        timestamp: new Date().toISOString(),
      })

      if (typeof this.originalOnError === 'function') {
        return this.originalOnError(message, source, lineno, colno, error)
      }
      return false
    }

    this.rejectionHandler = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message = reason instanceof Error ? reason.message : String(reason)
      const stack =
        reason instanceof Error && reason.stack ? truncateString(reason.stack, 2000) : undefined

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

    window.onerror = this.originalOnError
    if (this.rejectionHandler) {
      window.removeEventListener('unhandledrejection', this.rejectionHandler)
    }

    this.buffer = []
    this.installed = false
  }
}

export const errorCollector = new ErrorCollector()
