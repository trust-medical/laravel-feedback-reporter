export function getNormalizedPerformance(): Record<string, unknown> | null {
  if (typeof window === 'undefined' || typeof performance === 'undefined') {
    return null
  }

  try {
    const navEntries = performance.getEntriesByType('navigation')
    if (navEntries && navEntries.length > 0) {
      const entry = navEntries[0] as PerformanceNavigationTiming
      return {
        navigation_type: entry.type,
        dom_interactive: Math.round(entry.domInteractive),
        dom_content_loaded: Math.round(entry.domContentLoadedEventEnd),
        load_event_end: Math.round(entry.loadEventEnd),
        response_start: Math.round(entry.responseStart),
        response_end: Math.round(entry.responseEnd),
        duration: Math.round(entry.duration),
        transfer_size: entry.transferSize,
        encoded_body_size: entry.encodedBodySize,
        decoded_body_size: entry.decodedBodySize,
      }
    }

    // Fallback to legacy timing
    const timing = performance.timing
    if (timing) {
      const navStart = timing.navigationStart
      return {
        dom_interactive: Math.max(0, timing.domInteractive - navStart),
        dom_content_loaded: Math.max(0, timing.domContentLoadedEventEnd - navStart),
        load_event_end: Math.max(0, timing.loadEventEnd - navStart),
        response_start: Math.max(0, timing.responseStart - navStart),
        response_end: Math.max(0, timing.responseEnd - navStart),
      }
    }

    return null
  } catch {
    return null
  }
}
