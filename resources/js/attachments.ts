import { AttachmentValidationError } from './errors'
import { DEFAULT_LIMITS } from './limits'
import type { FeedbackAttachmentInput, FeedbackLimits } from './types'

export interface PreparedAttachment {
  file: File | Blob
  source: string
  filename: string
}

export type AttachmentLimits = Pick<
  FeedbackLimits,
  'maxFiles' | 'maxFileSizeKb' | 'maxTotalSizeKb' | 'allowedMimes'
>

function formatMegabytes(bytes: number): string {
  const megabytes = bytes / 1024 / 1024
  return Number.isInteger(megabytes) ? String(megabytes) : megabytes.toFixed(1)
}

/**
 * Validate and normalize attachments before submission.
 *
 * Pass the server's limits (for example from `reporter.getAvailability()`) as the
 * second argument. The legacy `(attachments, maxFiles, maxFileSizeBytes)` signature
 * is still accepted.
 */
export function prepareAttachments(
  rawAttachments?: FeedbackAttachmentInput[],
  limitsOrMaxFiles?: Partial<AttachmentLimits> | number,
  legacyMaxFileSize?: number,
): PreparedAttachment[] {
  if (!rawAttachments || rawAttachments.length === 0) {
    return []
  }

  const limits: Partial<AttachmentLimits> =
    typeof limitsOrMaxFiles === 'number'
      ? {
          maxFiles: limitsOrMaxFiles,
          ...(legacyMaxFileSize !== undefined ? { maxFileSizeKb: legacyMaxFileSize / 1024 } : {}),
        }
      : (limitsOrMaxFiles ?? {})

  const maxFiles = limits.maxFiles ?? DEFAULT_LIMITS.maxFiles
  const maxFileSize = (limits.maxFileSizeKb ?? DEFAULT_LIMITS.maxFileSizeKb) * 1024
  const maxTotalSize = (limits.maxTotalSizeKb ?? DEFAULT_LIMITS.maxTotalSizeKb) * 1024
  const allowedMimes = limits.allowedMimes ?? DEFAULT_LIMITS.allowedMimes

  if (rawAttachments.length > maxFiles) {
    throw new AttachmentValidationError(
      `Cannot attach more than ${maxFiles} files. Provided: ${rawAttachments.length}`,
    )
  }

  let totalSize = 0

  const prepared = rawAttachments.map((item, index) => {
    const file = item.file

    if (!(file instanceof Blob)) {
      throw new AttachmentValidationError(
        `Attachment at index ${index} is not a valid File or Blob.`,
      )
    }

    const label = item.filename || (file instanceof File && file.name) || 'file'

    // Blobs without a type are left to the server, which checks the real content.
    if (file.type && !allowedMimes.includes(file.type)) {
      throw new AttachmentValidationError(
        `Attachment "${label}" has an unsupported type (${file.type}).`,
      )
    }

    if (file.size > maxFileSize) {
      throw new AttachmentValidationError(
        `Attachment "${label}" exceeds maximum allowed size (${formatMegabytes(maxFileSize)}MB).`,
      )
    }

    totalSize += file.size

    let filename = item.filename
    if (!filename) {
      if (file instanceof File && file.name) {
        filename = file.name
      } else {
        const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : 'png'
        filename = `attachment-${Date.now()}-${index}.${ext}`
      }
    }

    return {
      file,
      source: item.source,
      filename,
    }
  })

  if (totalSize > maxTotalSize) {
    throw new AttachmentValidationError(
      `Attachments exceed the maximum total size (${formatMegabytes(maxTotalSize)}MB).`,
    )
  }

  return prepared
}
