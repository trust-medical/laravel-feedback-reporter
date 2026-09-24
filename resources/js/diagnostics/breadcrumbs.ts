import { sanitizeUrl } from '../sanitizer'

export interface BreadcrumbItem {
  category: 'click' | 'navigation' | 'submit'
  message: string
  data?: Record<string, unknown>
  timestamp: string
}

class BreadcrumbsCollector {
  private buffer: BreadcrumbItem[] = []
  private maxEntries: number = 50
  private installed: boolean = false
  private subscribers: number = 0
  private clickHandler: ((e: MouseEvent) => void) | null = null
  private submitHandler: ((e: SubmitEvent) => void) | null = null
  private popstateHandler: (() => void) | null = null

  public init(maxEntries: number = 50): void {
    if (typeof window === 'undefined') {
      return
    }
    if (this.installed) {
      this.subscribers += 1
      return
    }

    this.maxEntries = maxEntries
    this.installed = true
    this.subscribers = 1

    // 1. Click listener (only records tag, id, safe class names, and target text up to 30 chars if safe)
    this.clickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target?.tagName) {
        return
      }

      // Ignore passwords or sensitive fields
      if (
        target instanceof HTMLInputElement &&
        (target.type === 'password' || target.getAttribute('autocomplete')?.includes('password'))
      ) {
        return
      }

      const tag = target.tagName.toLowerCase()
      const id = target.id || undefined
      const classes =
        target.className && typeof target.className === 'string'
          ? target.className.split(/\s+/).filter(Boolean).slice(0, 5)
          : undefined

      this.add({
        category: 'click',
        message: `Click on <${tag}${id ? `#${id}` : ''}>`,
        data: { tag, id, classes },
        timestamp: new Date().toISOString(),
      })
    }
    document.addEventListener('click', this.clickHandler, true)

    // 2. Form submit listener (NO form values recorded)
    this.submitHandler = (e: SubmitEvent) => {
      const target = e.target as HTMLFormElement | null
      if (!target?.tagName) {
        return
      }

      const id = target.id || undefined
      const action = target.action ? sanitizeUrl(target.action) : undefined

      this.add({
        category: 'submit',
        message: `Submit form${id ? ` #${id}` : ''}`,
        data: { id, action },
        timestamp: new Date().toISOString(),
      })
    }
    document.addEventListener('submit', this.submitHandler, true)

    // 3. Navigation listener
    this.popstateHandler = () => {
      this.add({
        category: 'navigation',
        message: `Navigated to ${sanitizeUrl(window.location.href)}`,
        timestamp: new Date().toISOString(),
      })
    }
    window.addEventListener('popstate', this.popstateHandler)
  }

  public add(item: BreadcrumbItem): void {
    this.buffer.push(item)
    if (this.buffer.length > this.maxEntries) {
      this.buffer.shift()
    }
  }

  public get(): BreadcrumbItem[] {
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

    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler, true)
    }
    if (this.submitHandler) {
      document.removeEventListener('submit', this.submitHandler, true)
    }
    if (this.popstateHandler) {
      window.removeEventListener('popstate', this.popstateHandler)
    }

    this.buffer = []
    this.installed = false
    this.subscribers = 0
    this.clickHandler = null
    this.submitHandler = null
    this.popstateHandler = null
  }
}

export const breadcrumbsCollector = new BreadcrumbsCollector()
