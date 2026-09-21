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
  private originalError: typeof console.error | null = null
  private originalWarn: typeof console.warn | null = null

  public init(maxEntries: number = 20): void {
    if (this.installed || typeof console === 'undefined') {
      return
    }

    this.maxEntries = maxEntries
    this.installed = true

    this.originalError = console.error
    this.originalWarn = console.warn

    console.error = (...args: unknown[]) => {
      this.add('error', args)
      this.originalError?.apply(console, args)
    }

    console.warn = (...args: unknown[]) => {
      this.add('warn', args)
      this.originalWarn?.apply(console, args)
    }
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

    if (this.originalError) {
      console.error = this.originalError
    }
    if (this.originalWarn) {
      console.warn = this.originalWarn
    }

    this.buffer = []
    this.installed = false
  }
}

export const consoleCollector = new ConsoleCollector()
