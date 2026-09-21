import { toBlob } from 'html-to-image'
import { CaptureError } from './errors'
import type { CaptureOptions } from './types'

interface RedactedItem {
  element: Element
  originalText?: string
  originalValue?: string
}

export async function captureScreenshot(options?: CaptureOptions): Promise<Blob> {
  const target =
    typeof options?.target === 'function'
      ? options.target()
      : options?.target || document.documentElement

  if (!target) {
    throw new CaptureError('No capture target element found.')
  }

  const redactedItems: RedactedItem[] = []

  try {
    // 1. Apply temporary DOM redactions
    const redactElements = target.querySelectorAll('[data-feedback-redact]')
    for (const el of Array.from(redactElements)) {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        redactedItems.push({
          element: el,
          originalValue: el.value,
        })
        el.value = '█'.repeat(Math.max(el.value.length, 8))
      } else {
        redactedItems.push({
          element: el,
          originalText: el.textContent || '',
        })
        el.textContent = '████████'
      }
    }

    // Default filter: skip data-feedback-ignore and sensitive inputs
    const filter = (node: HTMLElement): boolean => {
      if (!node || !node.getAttribute) {
        return true
      }

      if (node.hasAttribute('data-feedback-ignore') || node.closest?.('[data-feedback-ignore]')) {
        return false
      }

      if (node instanceof HTMLInputElement && node.type === 'password') {
        return false
      }

      if (options?.filter) {
        return options.filter(node)
      }

      return true
    }

    const blob = await toBlob(target, {
      pixelRatio: options?.pixelRatio ?? 1,
      quality: options?.quality ?? 0.92,
      backgroundColor: options?.backgroundColor ?? '#ffffff',
      cacheBust: options?.cacheBust ?? true,
      filter,
    })

    if (!blob) {
      throw new CaptureError('Failed to generate image blob from target.')
    }

    return blob
  } catch (err) {
    if (err instanceof CaptureError) {
      throw err
    }
    throw new CaptureError(
      `Screenshot capture failed: ${err instanceof Error ? err.message : String(err)}`,
      err,
    )
  } finally {
    // Guaranteed DOM restoration regardless of outcome
    for (const item of redactedItems) {
      try {
        if (item.originalValue !== undefined && 'value' in item.element) {
          ;(item.element as HTMLInputElement).value = item.originalValue
        }
        if (item.originalText !== undefined) {
          item.element.textContent = item.originalText
        }
      } catch {
        // Suppress restoration errors
      }
    }
  }
}
