/**
 * Generate a random identifier that matches the server's client_report_id
 * format (`^[A-Za-z0-9_-]{8,64}$`).
 *
 * `crypto.randomUUID` only exists in secure contexts (HTTPS or localhost),
 * so plain-HTTP environments such as internal staging hosts fall back to
 * `crypto.getRandomValues` or, as a last resort, `Math.random`.
 */
export function createId(): string {
  const cryptoApi = typeof crypto !== 'undefined' ? crypto : undefined

  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    try {
      return cryptoApi.randomUUID()
    } catch {
      // Fall through to the insecure-context fallbacks.
    }
  }

  const bytes = new Uint8Array(16)
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    cryptoApi.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
