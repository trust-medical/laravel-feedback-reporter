import { breadcrumbsCollector } from './diagnostics/breadcrumbs'
import { consoleCollector } from './diagnostics/console'
import { errorCollector } from './diagnostics/errors'
import { networkErrorCollector } from './diagnostics/network'
import { getNormalizedPerformance } from './diagnostics/performance'
import { sanitizeUrl } from './sanitizer'
import type { DiagnosticContext, FeedbackReporterConfig } from './types'

export async function collectDiagnosticContext(
  config?: FeedbackReporterConfig,
): Promise<DiagnosticContext> {
  const context: DiagnosticContext = {}

  if (typeof window === 'undefined') {
    return context
  }

  // 1. Page Context
  context.page = {
    url: sanitizeUrl(window.location.href, config?.url),
    origin: window.location.origin,
    pathname: window.location.pathname,
    title: document.title || '',
    referrer: document.referrer ? sanitizeUrl(document.referrer, config?.url) : '',
  }

  // 2. Viewport Context
  context.viewport = {
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    document_width: document.documentElement.scrollWidth,
    document_height: document.documentElement.scrollHeight,
    scroll_x: window.scrollX,
    scroll_y: window.scrollY,
    device_pixel_ratio: window.devicePixelRatio || 1,
  }

  // 3. Screen Context
  if (window.screen) {
    context.screen = {
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      screen_avail_width: window.screen.availWidth,
      screen_avail_height: window.screen.availHeight,
      screen_color_depth: window.screen.colorDepth,
      screen_pixel_depth: window.screen.pixelDepth,
    }
  }

  // 4. Browser Context
  const nav = window.navigator as Navigator & {
    userAgentData?: {
      brands?: Array<{ brand: string; version: string }>
      mobile?: boolean
      platform?: string
    }
    deviceMemory?: number
    connection?: {
      effectiveType?: string
      downlink?: number
      rtt?: number
      saveData?: boolean
      type?: string
    }
  }

  context.browser = {
    user_agent: nav.userAgent,
    language: nav.language,
    languages: nav.languages ? [...nav.languages] : [nav.language],
    platform: nav.platform,
    vendor: nav.vendor,
    cookie_enabled: nav.cookieEnabled,
    online: nav.onLine,
    do_not_track: nav.doNotTrack,
    hardware_concurrency: nav.hardwareConcurrency,
    device_memory: nav.deviceMemory,
    user_agent_data: nav.userAgentData
      ? {
          brands: nav.userAgentData.brands,
          mobile: nav.userAgentData.mobile,
          platform: nav.userAgentData.platform,
        }
      : undefined,
  }

  // 5. Network Context
  if (nav.connection) {
    context.network = {
      effective_type: nav.connection.effectiveType,
      downlink: nav.connection.downlink,
      rtt: nav.connection.rtt,
      save_data: nav.connection.saveData,
      connection_type: nav.connection.type,
    }
  }

  // 6. Active Element Context (privacy-conscious: tag, id, classes only)
  const activeEl = document.activeElement
  if (activeEl && activeEl !== document.body) {
    context.active_element = {
      tag: activeEl.tagName.toLowerCase(),
      id: activeEl.id || undefined,
      classes:
        activeEl.className && typeof activeEl.className === 'string'
          ? activeEl.className.split(/\s+/).filter(Boolean).slice(0, 5)
          : undefined,
    }
  }

  // 7. Storage Context (explicit allowlist ONLY)
  if (config?.storage) {
    const storageData: Record<string, unknown> = {}

    if (config.storage.localStorageKeys?.length && typeof localStorage !== 'undefined') {
      const ls: Record<string, string | null> = {}
      for (const key of config.storage.localStorageKeys) {
        ls[key] = localStorage.getItem(key)
      }
      storageData.local_storage = ls
    }

    if (config.storage.sessionStorageKeys?.length && typeof sessionStorage !== 'undefined') {
      const ss: Record<string, string | null> = {}
      for (const key of config.storage.sessionStorageKeys) {
        ss[key] = sessionStorage.getItem(key)
      }
      storageData.session_storage = ss
    }

    if (Object.keys(storageData).length > 0) {
      context.storage = storageData
    }
  }

  // 8. Diagnostics
  if (config?.diagnostics?.performance !== false) {
    const perf = getNormalizedPerformance()
    if (perf) {
      context.performance = perf
    }
  }

  const errors = errorCollector.get()
  if (errors.length > 0) {
    context.errors = errors
  }

  const consoleEntries = consoleCollector.get()
  if (consoleEntries.length > 0) {
    context.console = consoleEntries
  }

  const networkErrors = networkErrorCollector.get()
  if (networkErrors.length > 0) {
    context.network_errors = networkErrors
  }

  const breadcrumbs = breadcrumbsCollector.get()
  if (breadcrumbs.length > 0) {
    context.breadcrumbs = breadcrumbs
  }

  // 9. Static / Dynamic Application Metadata
  if (config?.metadata) {
    const appMeta =
      typeof config.metadata === 'function' ? await config.metadata() : config.metadata
    if (appMeta && typeof appMeta === 'object') {
      context.application = appMeta
    }
  }

  return context
}
