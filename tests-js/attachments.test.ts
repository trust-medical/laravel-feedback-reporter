import { describe, expect, it } from 'vitest'
import { prepareAttachments } from '../resources/js/attachments'
import { AttachmentValidationError } from '../resources/js/errors'

describe('attachments', () => {
  it('returns empty array when no attachments provided', () => {
    expect(prepareAttachments()).toEqual([])
    expect(prepareAttachments([])).toEqual([])
  })

  it('normalizes Blob with auto-generated filename', () => {
    const blob = new Blob(['sample-image-content'], { type: 'image/png' })
    const prepared = prepareAttachments([{ file: blob, source: 'automatic_capture' }])

    expect(prepared).toHaveLength(1)
    expect(prepared[0]?.source).toBe('automatic_capture')
    expect(prepared[0]?.filename).toMatch(/^attachment-\d+-0\.png$/)
  })

  it('preserves existing File name', () => {
    const file = new File(['content'], 'user_screenshot.jpg', { type: 'image/jpeg' })
    const prepared = prepareAttachments([{ file, source: 'user_screenshot' }])

    expect(prepared[0]?.filename).toBe('user_screenshot.jpg')
    expect(prepared[0]?.source).toBe('user_screenshot')
  })

  it('throws AttachmentValidationError when exceeding max files', () => {
    const blob = new Blob(['test'], { type: 'image/png' })
    const list = Array(6).fill({ file: blob, source: 'attachment' })

    expect(() => prepareAttachments(list, 5)).toThrow(AttachmentValidationError)
  })

  it('throws AttachmentValidationError when file exceeds max size', () => {
    const hugeBlob = new Blob([new Uint8Array(1000)], { type: 'image/png' })

    expect(() => prepareAttachments([{ file: hugeBlob, source: 'attachment' }], 5, 500)).toThrow(
      AttachmentValidationError,
    )
  })
})
