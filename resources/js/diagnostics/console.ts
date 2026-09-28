import { safeStringify, truncateString } from '../sanitizer'
import { normalizeMaxEntries } from './buffer'

const MAX_ARGUMENTS = 10
const MAX_ARGUMENT_LENGTH = 500

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
  /**
   * Each installation gets a new version. A wrapper records only while its version is
   * active, so a wrapper left in place (because another library wrapped console after
   * it) passes calls through silently and a reinstall never records twice.
   */
  private activeVersion: number = 0
  private versionCounter: number = 0
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

    this.maxEntries = normalizeMaxEntries(maxEntries, 20)
    this.installed = true
    this.subscribers = 1

    const version = ++this.versionCounter
    this.activeVersion = version

    const originalError = console.error
    const originalWarn = console.warn
    this.originalError = originalError
    this.originalWarn = originalWarn

    this.wrappedError = (...args: unknown[]) => {
      if (this.activeVersion === version) {
        this.add('error', args)
      }
      originalError.apply(console, args)
    }
    console.error = this.wrappedError

    this.wrappedWarn = (...args: unknown[]) => {
      if (this.activeVersion === version) {
        this.add('warn', args)
      }
      originalWarn.apply(console, args)
    }
    console.warn = this.wrappedWarn
  }

  private add(level: 'error' | 'warn', args: unknown[]): void {
    const messages = args.slice(0, MAX_ARGUMENTS).map((arg) => {
      if (typeof arg === 'string') {
        return truncateString(arg, MAX_ARGUMENT_LENGTH)
      }
      if (arg instanceof Error) {
        return truncateString(`${arg.name}: ${arg.message}`, MAX_ARGUMENT_LENGTH)
      }
      return safeStringify(arg, MAX_ARGUMENT_LENGTH)
    })
    if (args.length > MAX_ARGUMENTS) {
      messages.push(`...[${args.length - MAX_ARGUMENTS} more arguments]`)
    }

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

    // Deactivate first: a wrapper that cannot be removed keeps delegating but stops recording.
    this.activeVersion = 0

    // Only restore when our wrapper is still on top; otherwise a later wrapper would be dropped.
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
