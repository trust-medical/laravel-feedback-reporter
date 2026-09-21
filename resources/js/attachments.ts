import { AttachmentValidationError } from './errors'
import type { FeedbackAttachmentInput } from './types'

export interface PreparedAttachment {
  file: File | Blob
  source: string
  filename: string
}

export function prepareAttachments(
  rawAttachments?: FeedbackAttachmentInput[],
  maxFiles: number = 5,
  maxFileSize: number = 5 * 1024 * 1024,
): PreparedAttachment[] {
  if (!rawAttachments || rawAttachments.length === 0) {
    return []
  }

  if (rawAttachments.length > maxFiles) {
    throw new AttachmentValidationError(
      `Cannot attach more than ${maxFiles} files. Provided: ${rawAttachments.length}`,
    )
  }

  return rawAttachments.map((item, index) => {
    const file = item.file

    if (!(file instanceof Blob)) {
      throw new AttachmentValidationError(
        `Attachment at index ${index} is not a valid File or Blob.`,
      )
    }

    if (file.size > maxFileSize) {
      throw new AttachmentValidationError(
        `Attachment "${item.filename || 'file'}" exceeds maximum allowed size (${Math.round(maxFileSize / 1024 / 1024)}MB).`,
      )
    }

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
}
