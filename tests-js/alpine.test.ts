import { describe, expect, it, vi } from 'vitest'
import { createAlpineFeedbackReporter } from '../resources/js/alpine'
import { ValidationError } from '../resources/js/errors'

describe('createAlpineFeedbackReporter', () => {
  it('manages attachment state properly', () => {
    const adapter = createAlpineFeedbackReporter()

    expect(adapter.attachments).toHaveLength(0)

    const blob1 = new Blob(['1'])
    const blob2 = new Blob(['2'])

    adapter.addAttachment(blob1, 'attachment')
    adapter.addAttachment(blob2, 'user_screenshot')

    expect(adapter.attachments).toHaveLength(2)
    expect(adapter.attachments[0]?.source).toBe('attachment')
    expect(adapter.attachments[1]?.source).toBe('user_screenshot')

    adapter.removeAttachment(0)
    expect(adapter.attachments).toHaveLength(1)
    expect(adapter.attachments[0]?.source).toBe('user_screenshot')

    adapter.clearAttachments()
    expect(adapter.attachments).toHaveLength(0)
  })

  it('submits feedback and resets state upon success', async () => {
    const adapter = createAlpineFeedbackReporter()

    vi.spyOn(adapter.reporter, 'report').mockResolvedValueOnce({
      id: '01J8TEST',
      success: true,
    })

    adapter.message = 'Test message'
    adapter.addAttachment(new Blob(['test']), 'attachment')

    expect(adapter.isSubmitting).toBe(false)

    const res = await adapter.submit()

    expect(res?.id).toBe('01J8TEST')
    expect(adapter.isSuccess).toBe(true)
    expect(adapter.message).toBe('')
    expect(adapter.attachments).toHaveLength(0)
    expect(adapter.isSubmitting).toBe(false)
  })
})

describe('createAlpineFeedbackReporter hardening', () => {
  it('starts with an unknown availability state', () => {
    expect(createAlpineFeedbackReporter().available).toBeNull()
  })

  it('reflects failures in state without rethrowing', async () => {
    const adapter = createAlpineFeedbackReporter()
    vi.spyOn(adapter.reporter, 'report').mockRejectedValueOnce(
      new ValidationError('Invalid', { message: ['Required'] }),
    )

    await expect(adapter.submit()).resolves.toBeNull()

    expect(adapter.errorMessage).toBe('Invalid')
    expect(adapter.fieldErrors).toEqual({ message: ['Required'] })
    expect(adapter.lastError).toBeInstanceOf(ValidationError)
    expect(adapter.isSubmitting).toBe(false)
  })

  it('reuses the draft ID on retry and rotates it after success', async () => {
    const adapter = createAlpineFeedbackReporter()
    const report = vi
      .spyOn(adapter.reporter, 'report')
      .mockRejectedValueOnce(new Error('Network'))
      .mockResolvedValueOnce({ id: '01J8TEST', success: true })
    const draftId = adapter.clientReportId

    await adapter.submit()
    await adapter.submit()

    expect(report.mock.calls[0]?.[0].clientReportId).toBe(draftId)
    expect(report.mock.calls[1]?.[0].clientReportId).toBe(draftId)
    expect(adapter.clientReportId).not.toBe(draftId)
  })

  it('tears down diagnostics in destroy', () => {
    const adapter = createAlpineFeedbackReporter({ diagnostics: { errors: true } })
    const destroyDiagnostics = vi.spyOn(adapter.reporter, 'destroyDiagnostics')

    adapter.destroy()

    expect(destroyDiagnostics).toHaveBeenCalledOnce()
  })
})
