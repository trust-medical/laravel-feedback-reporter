import { sanitizeUrl } from '../sanitizer'
import { normalizeMaxEntries } from './buffer'

export interface CapturedNetworkErrorItem {
  method: string
  url: string
  status: number | string
  duration_ms?: number
  timestamp: string
}

class NetworkErrorCollector {
  private buffer: CapturedNetworkErrorItem[] = []
  private maxEntries: number = 20
  private installed: boolean = false
  private subscribers: number = 0
  /**
   * Each installation gets a new version. A wrapper records only while its version is
   * active, so a wrapper left in place (because another library wrapped fetch/XHR after
   * it) passes requests through silently and a reinstall never records twice.
   */
  private activeVersion: number = 0
  private versionCounter: number = 0
  private wrappedFetch: typeof window.fetch | null = null
  private wrappedXhrOpen: typeof XMLHttpRequest.prototype.open | null = null
  private wrappedXhrSend: typeof XMLHttpRequest.prototype.send | null = null
  private originalFetch: typeof window.fetch | null = null
  private originalXhrOpen: typeof XMLHttpRequest.prototype.open | null = null
  private originalXhrSend: typeof XMLHttpRequest.prototype.send | null = null

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

    const version = ++this.versionCounter
    this.activeVersion = version
    const isActive = () => this.activeVersion === version

    // 1. Intercept fetch
    if (typeof window.fetch === 'function') {
      const originalFetch = window.fetch
      this.originalFetch = originalFetch
      const self = this

      window.fetch = async function (
        input: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> {
        const start = performance.now()
        const method = (
          init?.method || (input instanceof Request ? input.method : 'GET')
        ).toUpperCase()
        const rawUrl =
          typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        const sanitized = sanitizeUrl(rawUrl)

        try {
          const response = await originalFetch.apply(this, [input, init])
          if (!response.ok && isActive()) {
            self.add({
              method,
              url: sanitized,
              status: response.status,
              duration_ms: Math.round(performance.now() - start),
              timestamp: new Date().toISOString(),
            })
          }
          return response
        } catch (err) {
          if (isActive()) {
            self.add({
              method,
              url: sanitized,
              status: 'NETWORK_ERROR',
              duration_ms: Math.round(performance.now() - start),
              timestamp: new Date().toISOString(),
            })
          }
          throw err
        }
      }
      this.wrappedFetch = window.fetch
    }

    // 2. Intercept XMLHttpRequest
    if (typeof XMLHttpRequest !== 'undefined') {
      const originalXhrOpen = XMLHttpRequest.prototype.open
      const originalXhrSend = XMLHttpRequest.prototype.send
      this.originalXhrOpen = originalXhrOpen
      this.originalXhrSend = originalXhrSend
      const self = this

      XMLHttpRequest.prototype.open = function (
        method: string,
        url: string | URL,
        ...rest: [boolean?, (string | null)?, (string | null)?]
      ) {
        ;(
          this as unknown as { _fbrMethod: string; _fbrUrl: string; _fbrStart: number }
        )._fbrMethod = method.toUpperCase()
        ;(this as unknown as { _fbrMethod: string; _fbrUrl: string; _fbrStart: number })._fbrUrl =
          sanitizeUrl(String(url))
        return originalXhrOpen.apply(this, [method, url, ...rest] as Parameters<
          typeof originalXhrOpen
        >)
      }

      XMLHttpRequest.prototype.send = function (...args) {
        const xhr = this as unknown as { _fbrMethod?: string; _fbrUrl?: string; _fbrStart?: number }
        xhr._fbrStart = performance.now()

        this.addEventListener('loadend', () => {
          if (isActive() && (this.status >= 400 || this.status === 0)) {
            self.add({
              method: xhr._fbrMethod || 'GET',
              url: xhr._fbrUrl || '',
              status: this.status === 0 ? 'NETWORK_ERROR' : this.status,
              duration_ms: xhr._fbrStart
                ? Math.round(performance.now() - xhr._fbrStart)
                : undefined,
              timestamp: new Date().toISOString(),
            })
          }
        })

        return originalXhrSend.apply(this, args)
      }
      this.wrappedXhrOpen = XMLHttpRequest.prototype.open
      this.wrappedXhrSend = XMLHttpRequest.prototype.send
    }
  }

  public add(item: CapturedNetworkErrorItem): void {
    this.buffer.push(item)
    if (this.buffer.length > this.maxEntries) {
      this.buffer.shift()
    }
  }

  public get(): CapturedNetworkErrorItem[] {
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

    // Deactivate first: wrappers that cannot be removed keep delegating but stop recording.
    this.activeVersion = 0

    // Only restore when our wrapper is still on top; otherwise a later wrapper would be dropped.
    if (this.originalFetch && window.fetch === this.wrappedFetch) {
      window.fetch = this.originalFetch
    }
    if (this.originalXhrOpen && XMLHttpRequest.prototype.open === this.wrappedXhrOpen) {
      XMLHttpRequest.prototype.open = this.originalXhrOpen
    }
    if (this.originalXhrSend && XMLHttpRequest.prototype.send === this.wrappedXhrSend) {
      XMLHttpRequest.prototype.send = this.originalXhrSend
    }

    this.buffer = []
    this.installed = false
    this.subscribers = 0
    this.originalFetch = null
    this.originalXhrOpen = null
    this.originalXhrSend = null
    this.wrappedFetch = null
    this.wrappedXhrOpen = null
    this.wrappedXhrSend = null
  }
}

export const networkErrorCollector = new NetworkErrorCollector()
