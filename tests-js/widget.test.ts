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
  open: () => Promise<void>
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

  it('opens the dialog with a visible message and a disabled form when unavailable', async () => {
    registerFeedbackReporterElement()
    document.documentElement.lang = 'en'
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ available: false }), { status: 200 }),
    )
    const element = document.createElement('trust-feedback-reporter') as FeedbackReporterElement
    document.body.append(element)
    const root = element.shadowRoot

    await element.open()

    const error = root?.querySelector<HTMLElement>('[data-feedback-error]')
    expect(root?.querySelector<HTMLDialogElement>('[data-feedback-dialog]')?.open).toBe(true)
    expect(error?.hidden).toBe(false)
    expect(error?.getAttribute('role')).toBe('alert')
    expect(error?.textContent).toBe('Feedback reporting is currently unavailable.')
    expect(root?.querySelector<HTMLButtonElement>('[data-feedback-submit]')?.disabled).toBe(true)
    expect(root?.querySelector<HTMLTextAreaElement>('[data-feedback-message]')?.disabled).toBe(true)
  })

  it('reflects the server limits in the file hint, accept list, and counter', async () => {
    registerFeedbackReporterElement()
    document.documentElement.lang = 'en'
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          available: true,
          limits: { max_files: 3, max_file_size_kb: 2048, allowed_mimes: ['image/png'] },
        }),
        { status: 200 },
      ),
    )
    const element = document.createElement('trust-feedback-reporter') as FeedbackReporterElement
    document.body.append(element)
    const root = element.shadowRoot

    await element.open()

    expect(root?.querySelector('[data-feedback-file-hint]')?.textContent).toBe(
      'PNG · up to 2 MB each',
    )
    expect(root?.querySelector<HTMLInputElement>('[data-feedback-files]')?.accept).toBe('image/png')
    expect(root?.querySelector('[data-feedback-count]')?.textContent).toBe('0 / 3')
  })

  it('rejects a whitespace-only message without sending a request', async () => {
    registerFeedbackReporterElement()
    document.documentElement.lang = 'en'
    const fetchMock = vi.spyOn(window, 'fetch')
    const element = document.createElement('trust-feedback-reporter') as FeedbackReporterElement
    document.body.append(element)
    const message =
      element.shadowRoot?.querySelector<HTMLTextAreaElement>('[data-feedback-message]')
    if (message) {
      message.value = '   '
    }

    await controllerFor(element).submit(new SubmitEvent('submit', { cancelable: true }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(element.shadowRoot?.querySelector('[data-feedback-error]')?.textContent).toBe(
      'Enter a feedback message.',
    )
  })

  it('aborts an in-flight submission when the dialog is closed', async () => {
    registerFeedbackReporterElement()
    document.documentElement.lang = 'en'
    let submitSignal: AbortSignal | undefined
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ available: true }), { status: 200 }))
      .mockImplementationOnce(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            submitSignal = init?.signal ?? undefined
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            )
          }),
      )
    const element = document.createElement('trust-feedback-reporter') as FeedbackReporterElement
    document.body.append(element)
    const root = element.shadowRoot
    root?.querySelector<HTMLDialogElement>('[data-feedback-dialog]')?.showModal()
    const message = root?.querySelector<HTMLTextAreaElement>('[data-feedback-message]')
    if (message) {
      message.value = 'Closing mid-flight'
    }

    const pending = controllerFor(element).submit(new SubmitEvent('submit', { cancelable: true }))
    await vi.waitFor(() => expect(submitSignal).toBeDefined())
    element.close()
    await pending

    expect(submitSignal?.aborted).toBe(true)
    expect(root?.querySelector<HTMLElement>('[data-feedback-error]')?.hidden).toBe(true)
    expect(root?.querySelector<HTMLButtonElement>('[data-feedback-submit]')?.disabled).toBe(false)
  })

  it('reuses the draft client report ID when a failed submission is retried', async () => {
    registerFeedbackReporterElement()
    document.documentElement.lang = 'ja'
    const available = () => new Response(JSON.stringify({ available: true }), { status: 200 })
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockResolvedValueOnce(available())
      .mockResolvedValueOnce(new Response('{}', { status: 419 }))
      .mockResolvedValueOnce(available())
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: '01J', success: true }), { status: 201 }),
      )
    vi.spyOn(window, 'setTimeout').mockImplementation(
      () => ({}) as ReturnType<typeof window.setTimeout>,
    )
    const element = document.createElement('trust-feedback-reporter') as FeedbackReporterElement
    document.body.append(element)
    const root = element.shadowRoot
    root?.querySelector<HTMLDialogElement>('[data-feedback-dialog]')?.showModal()
    const message = root?.querySelector<HTMLTextAreaElement>('[data-feedback-message]')
    if (message) {
      message.value = 'Retry me'
    }
    const submit = () =>
      controllerFor(element).submit(new SubmitEvent('submit', { cancelable: true }))

    await submit()
    expect(root?.querySelector('[data-feedback-error]')?.textContent).toBe(
      'セッションの有効期限が切れました。ページを再読み込みしてから再試行してください。',
    )
    await submit()

    const ids = [1, 3].map((index) =>
      (fetchMock.mock.calls[index]?.[1]?.body as FormData | undefined)?.get('client_report_id'),
    )
    expect(ids[0]).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
    expect(ids[0]).toBe(ids[1])
    expect(root?.querySelector('.eyebrow')?.textContent).toBe('フィードバック')
  })

  it('applies a config assigned after connection and before upgrade', () => {
    const early = document.createElement('late-feedback-reporter') as FeedbackReporterElement
    ;(early as unknown as { config: unknown }).config = { endpoint: '/early' }
    document.body.append(early)
    registerFeedbackReporterElement('late-feedback-reporter')

    expect(early.config).toEqual({ endpoint: '/early' })
    expect(Object.hasOwn(early, 'config')).toBe(false)

    early.config = { endpoint: '/later', sourceType: 'admin' }

    expect(early.config.endpoint).toBe('/later')
    expect(early.shadowRoot?.querySelectorAll('[data-feedback-launcher]')).toHaveLength(1)
    expect(Reflect.get(controllerFor(early), 'config')).toMatchObject({
      endpoint: '/later',
      sourceType: 'admin',
    })
  })

  it('treats empty route-name and panel-id attributes as unset', () => {
    registerFeedbackReporterElement()
    const element = document.createElement('trust-feedback-reporter') as FeedbackReporterElement
    element.setAttribute('route-name', '')
    element.setAttribute('panel-id', '')
    document.body.append(element)

    expect(Reflect.get(controllerFor(element), 'config')).toMatchObject({
      routeName: null,
      panelId: null,
    })
  })

  it('can be imported where HTMLElement is not defined', async () => {
    vi.resetModules()
    vi.stubGlobal('HTMLElement', undefined)

    try {
      const module = await import('../resources/js/widget')
      expect(typeof module.registerFeedbackReporterElement).toBe('function')
    } finally {
      vi.unstubAllGlobals()
      vi.resetModules()
    }
  })
})
