import { truncateString } from '../sanitizer'

export interface CapturedConsoleItem {
  level: 'error' | 'warn'
  messages: string[]
  timestamp: string
}

class ConsoleCollector {
  private buffer: CapturedConsoleItem[] = []
  private maxEntries: number = 20
  private installed: boolean = false
  private subscribers: number = 0
  private wrappedError: typeof console.error | null = null
  private wrappedWarn: typeof console.warn | null = null
  private originalError: typeof console.error | null = null
  private originalWarn: typeof console.warn | null = null

  public init(maxEntries: number = 20): void {
    if (typeof console === 'undefined') {
      return
    }
    if (this.installed) {
      this.subscribers += 1
      return
    }

    this.maxEntries = maxEntries
    this.installed = true
    this.subscribers = 1

    this.originalError = console.error
    this.originalWarn = console.warn

    this.wrappedError = (...args: unknown[]) => {
      this.add('error', args)
      this.originalError?.apply(console, args)
    }
    console.error = this.wrappedError

    this.wrappedWarn = (...args: unknown[]) => {
      this.add('warn', args)
      this.originalWarn?.apply(console, args)
    }
    console.warn = this.wrappedWarn
  }

  private add(level: 'error' | 'warn', args: unknown[]): void {
    const messages = args.map((arg) => {
      if (typeof arg === 'string') {
        return truncateString(arg, 500)
      }
      if (arg instanceof Error) {
        return truncateString(`${arg.name}: ${arg.message}`, 500)
      }
      try {
        return truncateString(JSON.stringify(arg), 500)
      } catch {
        return String(arg)
      }
    })

    this.buffer.push({
      level,
      messages,
      timestamp: new Date().toISOString(),
    })

    if (this.buffer.length > this.maxEntries) {
      this.buffer.shift()
    }
  }

  public get(): CapturedConsoleItem[] {
    return [...this.buffer]
  }

  public clear(): void {
    this.buffer = []
  }

  public destroy(): void {
    if (!this.installed || typeof console === 'undefined') {
      return
    }

    if (this.subscribers > 1) {
      this.subscribers -= 1
      return
    }

    if (this.originalError && console.error === this.wrappedError) {
      console.error = this.originalError
    }
    if (this.originalWarn && console.warn === this.wrappedWarn) {
      console.warn = this.originalWarn
    }

    this.buffer = []
    this.installed = false
    this.subscribers = 0
    this.originalError = null
    this.originalWarn = null
    this.wrappedError = null
    this.wrappedWarn = null
  }
}

export const consoleCollector = new ConsoleCollector()
