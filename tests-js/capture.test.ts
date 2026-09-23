import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  html2canvas: vi.fn(),
  toBlob: vi.fn(),
}))

vi.mock('html-to-image', () => ({ toBlob: mocks.toBlob }))
vi.mock('html2canvas-pro', () => ({ default: mocks.html2canvas }))

import { captureScreenshot } from '../resources/js/capture'

describe('captureScreenshot', () => {
  const capturedBlob = new Blob(['capture'], { type: 'image/png' })

  beforeEach(() => {
    mocks.html2canvas.mockReset()
    mocks.toBlob.mockReset()
    mocks.toBlob.mockResolvedValue(capturedBlob)
  })

  it('uses html-to-image by default', async () => {
    const target = document.createElement('main')

    const result = await captureScreenshot({ target })

    expect(result).toBe(capturedBlob)
    expect(mocks.toBlob).toHaveBeenCalledOnce()
    expect(mocks.html2canvas).not.toHaveBeenCalled()
  })

  it('uses html2canvas when selected', async () => {
    const target = document.createElement('main')
    const canvas = document.createElement('canvas')
    vi.spyOn(canvas, 'toBlob').mockImplementation((callback) => callback(capturedBlob))
    mocks.html2canvas.mockResolvedValue(canvas)

    const result = await captureScreenshot({
      target,
      renderer: 'html2canvas',
      pixelRatio: 2,
      backgroundColor: null,
    })

    expect(result).toBe(capturedBlob)
    expect(mocks.html2canvas).toHaveBeenCalledWith(
      target,
      expect.objectContaining({
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        scale: 2,
        useCORS: false,
      }),
    )
    expect(mocks.toBlob).not.toHaveBeenCalled()
  })
})
