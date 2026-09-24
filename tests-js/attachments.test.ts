import { describe, expect, it } from 'vitest'
import { prepareAttachments } from '../resources/js/attachments'
import { AttachmentValidationError } from '../resources/js/errors'

describe('attachments', () => {
  it('returns an empty array when no attachments are provided', () => {
    expect(prepareAttachments()).toEqual([])
    expect(prepareAttachments([])).toEqual([])
  })

  it('normalizes a Blob with an attachment filename', () => {
    const blob = new Blob(['sample-image-content'], { type: 'image/png' })

    const prepared = prepareAttachments([{ file: blob, source: 'attachment' }])

    expect(prepared).toHaveLength(1)
    expect(prepared[0]?.source).toBe('attachment')
    expect(prepared[0]?.filename).toMatch(/^attachment-\d+-0\.png$/)
  })

  it('preserves a manual screenshot File name and source', () => {
    const file = new File(['content'], 'user_screenshot.jpg', { type: 'image/jpeg' })

    const prepared = prepareAttachments([{ file, source: 'user_screenshot' }])

    expect(prepared[0]?.filename).toBe('user_screenshot.jpg')
    expect(prepared[0]?.source).toBe('user_screenshot')
  })

  it('rejects too many files and oversized files', () => {
    const blob = new Blob(['test'], { type: 'image/png' })
    const oversized = new Blob([new Uint8Array(1000)], { type: 'image/png' })

    expect(() =>
      prepareAttachments(Array(6).fill({ file: blob, source: 'attachment' }), 5),
    ).toThrow(AttachmentValidationError)
    expect(() => prepareAttachments([{ file: oversized, source: 'attachment' }], 5, 500)).toThrow(
      AttachmentValidationError,
    )
  })
})
