import { afterEach, describe, expect, it, vi } from 'vitest'
import { FeedbackReporterElement, registerFeedbackReporterElement } from '../resources/js/widget'

interface TestEditableImage {
  id: string
  filename: string
  objectUrl: string
  history: unknown[][]
  annotations: unknown[]
  zoom: number
}

interface WidgetControllerHarness {
  images: TestEditableImage[]
  selectedImageId: string | null
  currentTool: string
  renderThumbnails: () => void
  getRenderPixelRatio: (item: {
    naturalWidth: number
    naturalHeight: number
    stageWidth: number
    stageHeight: number
  }) => number
  submit: (event: SubmitEvent) => Promise<void>
}

function controllerFor(element: FeedbackReporterElement): WidgetControllerHarness {
  return Reflect.get(element, 'controller') as WidgetControllerHarness
}

function testImage(): TestEditableImage {
  return {
    id: 'image-1',
    filename: 'screen.png',
    objectUrl: 'blob:screen',
    history: [[]],
    annotations: [],
    zoom: 1,
  }
}

describe('feedback reporter web component', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.documentElement.lang = ''
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('registers idempotently and renders an open isolated shadow root', () => {
    registerFeedbackReporterElement()
    registerFeedbackReporterElement()
    document.documentElement.lang = 'ja'
    const element = document.createElement('trust-feedback-reporter')

    document.body.append(element)

    expect(element).toBeInstanceOf(FeedbackReporterElement)
    expect(element.shadowRoot).not.toBeNull()
    expect(element.shadowRoot?.querySelector('[data-feedback-launcher]')?.textContent).toContain(
      'フィードバックを報告',
    )
    expect(document.querySelector('[data-feedback-launcher]')).toBeNull()
  })

  it('uses English labels outside Japanese documents', () => {
    registerFeedbackReporterElement()
    document.documentElement.lang = 'en'
    const element = document.createElement('trust-feedback-reporter')

    document.body.append(element)

    expect(element.shadowRoot?.querySelector('[data-feedback-launcher]')?.textContent).toContain(
      'Send feedback',
    )
  })

  it('does not replace host globals when connected with default settings', () => {
    registerFeedbackReporterElement()
    const originalFetch = window.fetch
    const originalConsoleError = console.error
    const originalOnError = window.onerror
    const element = document.createElement('trust-feedback-reporter')

    document.body.append(element)

    expect(window.fetch).toBe(originalFetch)
    expect(console.error).toBe(originalConsoleError)
    expect(window.onerror).toBe(originalOnError)
  })

  it('supports an idempotently registered custom tag name', () => {
    registerFeedbackReporterElement('custom-feedback-reporter')
    registerFeedbackReporterElement('custom-feedback-reporter')

    const element = document.createElement('custom-feedback-reporter')
    document.body.append(element)

    expect(element).toBeInstanceOf(FeedbackReporterElement)
    expect(element.shadowRoot?.querySelector('[data-feedback-launcher]')).not.toBeNull()
  })

  it('honors the language and color scheme attributes', () => {
    registerFeedbackReporterElement()
    const element = document.createElement('trust-feedback-reporter')
    element.lang = 'ja'
    element.setAttribute('color-scheme', 'dark')

    document.body.append(element)

    expect(element.shadowRoot?.querySelector('[data-feedback-launcher]')?.textContent).toContain(
      'フィードバックを報告',
    )
    expect(element.getAttribute('color-scheme')).toBe('dark')
    expect(element.shadowRoot?.querySelector('style')?.textContent).toContain(
      ':host([color-scheme="dark"])',
    )
  })

  it('provides GUI-only annotation controls below the fixed editor viewport', () => {
    registerFeedbackReporterElement()
    document.documentElement.lang = 'ja'
    const element = document.createElement('trust-feedback-reporter') as FeedbackReporterElement
    document.body.append(element)
    const root = element.shadowRoot
    const viewport = root?.querySelector('[data-feedback-viewport]')
    const toolbar = root?.querySelector('[role="toolbar"]')
    const help = root?.querySelector('.help')
    const move = root?.querySelector<HTMLButtonElement>('[data-tool="move"]')
    const pan = root?.querySelector<HTMLButtonElement>('[data-tool="pan"]')

    expect(move?.textContent).toBe('移動')
    expect(pan?.textContent).toBe('手のひら')
    expect(help?.textContent).not.toMatch(/Delete|Ctrl|Cmd/)
    expect(viewport?.compareDocumentPosition(toolbar as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(root?.querySelector('[data-feedback-undo]')).not.toBeNull()
    expect(root?.querySelector('[data-feedback-delete]')?.textContent).toBe('図形を削除')
    expect(root?.querySelector('[data-feedback-clear]')).toBeNull()
    expect(root?.querySelector('[data-feedback-fit-all]')).toBeNull()
    expect(root?.querySelectorAll('.toolbar-icon')).toHaveLength(6)
    expect(root?.querySelector('style')?.textContent).toContain(
      '.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: .25rem; }',
    )
    for (const selector of [
      '[data-tool="move"]',
      '[data-tool="pan"]',
      '[data-tool="rectangle"]',
      '[data-tool="arrow"]',
      '[data-feedback-undo]',
      '[data-feedback-delete]',
    ]) {
      expect(root?.querySelector(selector)?.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    }
    expect(root?.querySelector('style')?.textContent).toContain(
      'height: min(48rem, calc(100dvh - 2rem))',
    )

    const controller = controllerFor(element)
    controller.images = [testImage()]
    controller.selectedImageId = 'image-1'
    controller.renderThumbnails()
    pan?.click()
    expect(controller.currentTool).toBe('pan')
  })

  it('removes an attached image from its thumbnail control and releases its object URL', () => {
    registerFeedbackReporterElement()
    document.documentElement.lang = 'en'
    const element = document.createElement('trust-feedback-reporter') as FeedbackReporterElement
    document.body.append(element)
    const controller = controllerFor(element)
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL')
    controller.images = [testImage()]
    controller.selectedImageId = 'image-1'
    controller.renderThumbnails()

    const removeButton = element.shadowRoot?.querySelector<HTMLButtonElement>(
      '[data-feedback-remove-image]',
    )
    expect(removeButton?.getAttribute('aria-label')).toBe('Remove attached image screen.png')

    removeButton?.click()

    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:screen')
    expect(element.shadowRoot?.querySelector('[data-feedback-count]')?.textContent).toBe('0 / 5')
    expect(element.shadowRoot?.querySelector('[data-feedback-thumbnail]')).toBeNull()
  })

  it('announces a successful submission before closing the dialog', async () => {
    registerFeedbackReporterElement()
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ available: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: '01JTEST', success: true }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    let closeDialog: ((...args: unknown[]) => void) | undefined
    vi.spyOn(window, 'setTimeout').mockImplementation((handler) => {
      closeDialog = handler

      return {} as ReturnType<typeof window.setTimeout>
    })
    const element = document.createElement('trust-feedback-reporter') as FeedbackReporterElement
    document.body.append(element)
    const root = element.shadowRoot
    const dialog = root?.querySelector<HTMLDialogElement>('[data-feedback-dialog]')
    const message = root?.querySelector<HTMLTextAreaElement>('[data-feedback-message]')
    dialog?.showModal()
    if (message) {
      message.value = 'The image is difficult to read.'
    }

    await controllerFor(element).submit(new SubmitEvent('submit', { cancelable: true }))

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(root?.querySelector('[data-feedback-success]')?.textContent).toContain(
      'Your feedback was sent',
    )
    expect(dialog?.open).toBe(true)

    expect(closeDialog).toBeTypeOf('function')
    ;(closeDialog as (...args: unknown[]) => void)()
    expect(dialog?.open).toBe(false)
  })

  it('renders backing canvases for the maximum useful display density', () => {
    registerFeedbackReporterElement()
    const element = document.createElement('trust-feedback-reporter') as FeedbackReporterElement
    document.body.append(element)

    expect(
      controllerFor(element).getRenderPixelRatio({
        naturalWidth: 2400,
        naturalHeight: 1600,
        stageWidth: 800,
        stageHeight: 533,
      }),
    ).toBe(2)
  })

  it('can reconnect without leaking its previous shadow content', () => {
    registerFeedbackReporterElement()
    const element = document.createElement('trust-feedback-reporter')
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL')

    document.body.append(element)
    element.remove()
    document.body.append(element)

    expect(element.shadowRoot?.querySelectorAll('[data-feedback-launcher]')).toHaveLength(1)
    expect(revokeObjectUrl).not.toHaveBeenCalled()
  })
})
