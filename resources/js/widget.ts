import Konva from 'konva'
import { createFeedbackReporter } from './reporter'
import type { FeedbackAttachmentInput, FeedbackImageSource, FeedbackReporterConfig } from './types'
import { widgetStyles } from './widget-styles'

export type FeedbackReporterColorScheme = 'auto' | 'light' | 'dark'

export interface FeedbackReporterWidgetConfig {
  endpoint?: string
  availabilityEndpoint?: string
  sourceType?: string
  routeName?: string | null
  panelId?: string | null
  reporter?: FeedbackReporterConfig
}

interface ResolvedWidgetConfig {
  endpoint?: string
  availabilityEndpoint?: string
  sourceType: string
  routeName: string | null
  panelId: string | null
  reporter?: FeedbackReporterConfig
  labels: WidgetLabels
}

interface WidgetLabels {
  launcher: string
  eyebrow: string
  title: string
  description: string
  close: string
  message: string
  messagePlaceholder: string
  images: string
  chooseImages: string
  dropHint: string
  fileHint: string
  attachments: string
  removeAttachment: string
  move: string
  pan: string
  rectangle: string
  arrow: string
  undo: string
  deleteSelection: string
  zoomOut: string
  zoomIn: string
  toolbar: string
  zoomGroup: string
  empty: string
  editorHelp: string
  cancel: string
  submit: string
  submitting: string
  unavailable: string
  fileLimit: string
  invalidType: string
  fileTooLarge: string
  totalTooLarge: string
  editedFileTooLarge: string
  editedTotalTooLarge: string
  exportFailed: string
  submitFailed: string
  validationFailed: string
  rateLimited: string
  success: string
}

type Tool = 'move' | 'pan' | 'rectangle' | 'arrow'
type AnnotationType = 'rectangle' | 'arrow'

interface AnnotationSnapshot {
  type: AnnotationType
  attrs: Record<string, unknown>
}

interface EditableImage {
  id: string
  blob: Blob
  filename: string
  source: FeedbackImageSource
  objectUrl: string
  image: HTMLImageElement
  naturalWidth: number
  naturalHeight: number
  stageWidth: number
  stageHeight: number
  zoom: number
  annotations: AnnotationSnapshot[]
  history: AnnotationSnapshot[][]
}

const MAX_FILES = 5
const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_TOTAL_SIZE = 20 * 1024 * 1024
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const ANNOTATION_COLOR = '#e11d48'
const ANNOTATION_STROKE = 4
const MIN_ZOOM = 0.5
const MAX_ZOOM = 2
const ZOOM_STEP = 0.25
const SUCCESS_CLOSE_DELAY = 1500

class WidgetController {
  private readonly reporter
  private readonly dialog: HTMLDialogElement
  private readonly launcher: HTMLButtonElement
  private readonly form: HTMLFormElement
  private readonly message: HTMLTextAreaElement
  private readonly fileInput: HTMLInputElement
  private readonly dropzone: HTMLElement
  private readonly thumbnails: HTMLElement
  private readonly thumbnailTemplate: HTMLTemplateElement
  private readonly count: HTMLElement
  private readonly canvasViewport: HTMLDivElement
  private readonly canvasHost: HTMLDivElement
  private readonly emptyState: HTMLElement
  private readonly errorMessage: HTMLElement
  private readonly successMessage: HTMLElement
  private readonly submitButton: HTMLButtonElement
  private readonly undoButton: HTMLButtonElement
  private readonly deleteButton: HTMLButtonElement
  private readonly zoomOutButton: HTMLButtonElement
  private readonly zoomInButton: HTMLButtonElement
  private readonly zoomLevel: HTMLOutputElement
  private readonly toolButtons: HTMLButtonElement[]
  private images: EditableImage[] = []
  private selectedImageId: string | null = null
  private currentTool: Tool = 'move'
  private stage: Konva.Stage | null = null
  private annotationLayer: Konva.Layer | null = null
  private transformer: Konva.Transformer | null = null
  private selectedShape: Konva.Shape | null = null
  private drawingShape: Konva.Shape | null = null
  private drawingOrigin: { x: number; y: number } | null = null
  private panOrigin: {
    clientX: number
    clientY: number
    scrollLeft: number
    scrollTop: number
  } | null = null
  private isSubmitting = false
  private successCloseTimer: number | null = null

  public constructor(
    private readonly root: ShadowRoot,
    private readonly config: ResolvedWidgetConfig,
  ) {
    this.dialog = this.requireElement<HTMLDialogElement>('[data-feedback-dialog]')
    this.launcher = this.requireElement<HTMLButtonElement>('[data-feedback-launcher]')
    this.form = this.requireElement<HTMLFormElement>('[data-feedback-form]')
    this.message = this.requireElement<HTMLTextAreaElement>('[data-feedback-message]')
    this.fileInput = this.requireElement<HTMLInputElement>('[data-feedback-files]')
    this.dropzone = this.requireElement('[data-feedback-dropzone]')
    this.thumbnails = this.requireElement('[data-feedback-thumbnails]')
    this.thumbnailTemplate = this.requireElement<HTMLTemplateElement>(
      '[data-feedback-thumbnail-template]',
    )
    this.count = this.requireElement('[data-feedback-count]')
    this.canvasViewport = this.requireElement<HTMLDivElement>('[data-feedback-viewport]')
    this.canvasHost = this.requireElement<HTMLDivElement>('[data-feedback-canvas]')
    this.emptyState = this.requireElement('[data-feedback-empty]')
    this.errorMessage = this.requireElement('[data-feedback-error]')
    this.successMessage = this.requireElement('[data-feedback-success]')
    this.submitButton = this.requireElement<HTMLButtonElement>('[data-feedback-submit]')
    this.undoButton = this.requireElement<HTMLButtonElement>('[data-feedback-undo]')
    this.deleteButton = this.requireElement<HTMLButtonElement>('[data-feedback-delete]')
    this.zoomOutButton = this.requireElement<HTMLButtonElement>('[data-feedback-zoom-out]')
    this.zoomInButton = this.requireElement<HTMLButtonElement>('[data-feedback-zoom-in]')
    this.zoomLevel = this.requireElement<HTMLOutputElement>('[data-feedback-zoom-level]')
    this.toolButtons = Array.from(this.root.querySelectorAll<HTMLButtonElement>('[data-tool]'))

    this.reporter = createFeedbackReporter({
      ...this.config.reporter,
      endpoint: this.config.endpoint,
      availabilityEndpoint: this.config.availabilityEndpoint,
    })

    this.bindEvents()
    this.updateControls()
  }

  private requireElement<T extends Element = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector)

    if (!element) {
      throw new Error(`Feedback reporter element is missing: ${selector}`)
    }

    return element
  }

  private bindEvents(): void {
    this.launcher.addEventListener('click', () => void this.open())
    this.form.addEventListener('submit', (event) => void this.submit(event))
    this.root
      .querySelector('[data-feedback-close]')
      ?.addEventListener('click', () => this.dialog.close())
    this.root
      .querySelector('[data-feedback-cancel]')
      ?.addEventListener('click', () => this.dialog.close())
    this.fileInput.addEventListener('change', () => void this.addFiles(this.fileInput.files))
    this.undoButton.addEventListener('click', () => this.undo())
    this.deleteButton.addEventListener('click', () => this.deleteSelectedShape())
    this.zoomOutButton.addEventListener('click', () => this.zoomBy(-ZOOM_STEP))
    this.zoomInButton.addEventListener('click', () => this.zoomBy(ZOOM_STEP))
    this.dialog.addEventListener('close', () => this.reset())

    for (const toolButton of this.toolButtons) {
      toolButton.addEventListener('click', () => this.setTool(toolButton.dataset.tool as Tool))
    }

    for (const eventName of ['dragenter', 'dragover']) {
      this.dropzone.addEventListener(eventName, (event) => {
        event.preventDefault()
        this.dropzone.dataset.dragging = 'true'
      })
    }

    for (const eventName of ['dragleave', 'drop']) {
      this.dropzone.addEventListener(eventName, (event) => {
        event.preventDefault()
        delete this.dropzone.dataset.dragging
      })
    }

    this.dropzone.addEventListener('drop', (event) => {
      if (event instanceof DragEvent) {
        void this.addFiles(event.dataTransfer?.files ?? null)
      }
    })
  }

  public async open(): Promise<void> {
    this.clearMessages()
    this.launcher.disabled = true

    try {
      if (!(await this.reporter.isAvailable())) {
        this.setError(this.config.labels.unavailable)
        return
      }

      await this.showDialog()
    } catch (error) {
      this.setError(this.errorText(error))
      await this.showDialog()
    } finally {
      this.launcher.disabled = false
    }
  }

  public close(): void {
    this.dialog.close()
  }

  private async showDialog(): Promise<void> {
    if (!this.dialog.open) {
      this.dialog.showModal()
    }

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    const item = this.getSelectedImage()
    if (item) {
      const dimensions = this.getStageDimensions(item.image)
      item.stageWidth = dimensions.width
      item.stageHeight = dimensions.height
      item.zoom = 1
      this.renderSelectedImage()
    }

    this.message.focus()
  }

  private async addFiles(files: FileList | null): Promise<void> {
    if (!files) {
      return
    }

    this.clearMessages()

    for (const file of Array.from(files)) {
      if (this.images.length >= MAX_FILES) {
        this.setError(this.config.labels.fileLimit)
        break
      }

      if (!ACCEPTED_TYPES.includes(file.type)) {
        this.setError(this.config.labels.invalidType.replace('{filename}', file.name))
        continue
      }

      if (file.size > MAX_FILE_SIZE) {
        this.setError(this.config.labels.fileTooLarge.replace('{filename}', file.name))
        continue
      }

      if (this.totalOriginalSize() + file.size > MAX_TOTAL_SIZE) {
        this.setError(this.config.labels.totalTooLarge)
        break
      }

      try {
        await this.addImage(file, file.name, 'attachment')
      } catch {
        this.setError(this.config.labels.invalidType.replace('{filename}', file.name))
      }
    }

    this.fileInput.value = ''
  }

  private async addImage(blob: Blob, filename: string, source: FeedbackImageSource): Promise<void> {
    const objectUrl = URL.createObjectURL(blob)

    try {
      const image = await this.loadImage(objectUrl)
      const dimensions = this.getStageDimensions(image)
      const editableImage: EditableImage = {
        id: crypto.randomUUID(),
        blob,
        filename,
        source,
        objectUrl,
        image,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        stageWidth: dimensions.width,
        stageHeight: dimensions.height,
        zoom: 1,
        annotations: [],
        history: [[]],
      }

      this.images.push(editableImage)
      this.selectedImageId = editableImage.id
      this.renderThumbnails()
      this.renderSelectedImage()
    } catch (error) {
      URL.revokeObjectURL(objectUrl)
      throw error
    }
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Image could not be loaded.'))
      image.src = url
    })
  }

  private getStageDimensions(image: HTMLImageElement): { width: number; height: number } {
    const viewportSize = this.getViewportAvailableSize()
    const availableWidth =
      this.canvasViewport.clientWidth > 0 ? viewportSize.width : Math.min(900, image.naturalWidth)
    const scale = Math.min(1, availableWidth / image.naturalWidth)

    return {
      width: Math.max(1, Math.round(image.naturalWidth * scale)),
      height: Math.max(1, Math.round(image.naturalHeight * scale)),
    }
  }

  private getViewportAvailableSize(): { width: number; height: number } {
    const styles = getComputedStyle(this.canvasViewport)
    const horizontalPadding =
      Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight)
    const verticalPadding =
      Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom)

    return {
      width: Math.max(1, this.canvasViewport.clientWidth - horizontalPadding),
      height: Math.max(1, this.canvasViewport.clientHeight - verticalPadding),
    }
  }

  private renderThumbnails(): void {
    this.thumbnails.replaceChildren()

    for (const item of this.images) {
      const fragment = this.thumbnailTemplate.content.cloneNode(true) as DocumentFragment
      const thumbnail = fragment.querySelector<HTMLElement>('[data-feedback-thumbnail]')
      const selectButton = fragment.querySelector<HTMLButtonElement>(
        '[data-feedback-thumbnail-select]',
      )
      const removeButton = fragment.querySelector<HTMLButtonElement>('[data-feedback-remove-image]')
      const image = fragment.querySelector<HTMLImageElement>('[data-thumbnail-image]')
      const label = fragment.querySelector<HTMLElement>('[data-thumbnail-label]')

      if (!thumbnail || !selectButton || !removeButton || !image || !label) {
        continue
      }

      thumbnail.dataset.selected = String(item.id === this.selectedImageId)
      image.src = item.objectUrl
      image.alt = item.filename
      label.textContent = item.filename
      removeButton.setAttribute(
        'aria-label',
        this.config.labels.removeAttachment.replace('{filename}', item.filename),
      )
      selectButton.addEventListener('click', () => {
        this.selectedImageId = item.id
        this.renderThumbnails()
        this.renderSelectedImage()
      })
      removeButton.addEventListener('click', () => this.removeImage(item.id))
      this.thumbnails.append(fragment)
    }

    this.count.textContent = `${this.images.length} / ${MAX_FILES}`
    this.updateControls()
  }

  private removeImage(imageId: string): void {
    const index = this.images.findIndex((item) => item.id === imageId)
    if (index === -1) {
      return
    }

    const [removed] = this.images.splice(index, 1)
    if (removed) {
      URL.revokeObjectURL(removed.objectUrl)
    }

    if (this.selectedImageId === imageId) {
      this.selectedImageId = this.images[Math.min(index, this.images.length - 1)]?.id ?? null
      this.renderSelectedImage()
    }

    this.renderThumbnails()
  }

  private renderSelectedImage(): void {
    this.destroyStage()
    const item = this.getSelectedImage()
    this.emptyState.hidden = item !== null
    this.canvasHost.hidden = item === null

    if (!item) {
      this.updateControls()

      return
    }

    const built = this.buildStage(item, this.canvasHost, true)
    this.stage = built.stage
    this.annotationLayer = built.annotationLayer
    this.transformer = built.transformer
    this.selectedShape = null
    this.bindStageDrawing(item)
    this.updateShapeInteractivity()
    this.applyZoom(item)
    this.updateControls()
  }

  private applyZoom(item: EditableImage): void {
    if (!this.stage) {
      return
    }

    const content = this.stage.getContent()
    content.style.transformOrigin = 'top left'
    content.style.transform = `scale(${item.zoom})`
    this.canvasHost.style.width = `${item.stageWidth * item.zoom}px`
    this.canvasHost.style.height = `${item.stageHeight * item.zoom}px`
  }

  private zoomBy(change: number): void {
    const item = this.getSelectedImage()
    if (!item) {
      return
    }

    const nextZoom =
      change < 0 ? Math.max(MIN_ZOOM, item.zoom + change) : Math.min(MAX_ZOOM, item.zoom + change)

    this.setZoom(item, nextZoom)
  }

  private setZoom(item: EditableImage, zoom: number): void {
    item.zoom = Number(zoom.toFixed(4))
    this.applyZoom(item)
    this.updateControls()
  }

  private buildStage(
    item: EditableImage,
    container: HTMLDivElement,
    interactive: boolean,
  ): {
    stage: Konva.Stage
    annotationLayer: Konva.Layer
    transformer: Konva.Transformer | null
  } {
    container.replaceChildren()

    const stage = new Konva.Stage({
      container,
      width: item.stageWidth,
      height: item.stageHeight,
    })
    const backgroundLayer = new Konva.Layer({ listening: false })
    backgroundLayer.add(
      new Konva.Image({
        image: item.image,
        width: item.stageWidth,
        height: item.stageHeight,
      }),
    )
    stage.add(backgroundLayer)

    const annotationLayer = new Konva.Layer()
    for (const annotation of item.annotations) {
      annotationLayer.add(this.createShape(annotation, interactive))
    }
    stage.add(annotationLayer)

    let transformer: Konva.Transformer | null = null
    if (interactive) {
      transformer = new Konva.Transformer({
        rotateEnabled: false,
        flipEnabled: false,
        borderStroke: ANNOTATION_COLOR,
        anchorStroke: ANNOTATION_COLOR,
        anchorFill: '#ffffff',
        anchorSize: 9,
      })
      annotationLayer.add(transformer)

      for (const shape of annotationLayer.find<Konva.Shape>('.annotation')) {
        this.bindShapeEvents(shape, item)
      }
    }

    const renderPixelRatio = interactive ? this.getRenderPixelRatio(item) : 1
    backgroundLayer.getCanvas().setPixelRatio(renderPixelRatio)
    annotationLayer.getCanvas().setPixelRatio(renderPixelRatio)
    annotationLayer.getHitCanvas().setPixelRatio(renderPixelRatio)
    backgroundLayer.draw()
    annotationLayer.draw()

    return { stage, annotationLayer, transformer }
  }

  private getRenderPixelRatio(item: EditableImage): number {
    const sourcePixelRatio = Math.min(
      item.naturalWidth / item.stageWidth,
      item.naturalHeight / item.stageHeight,
    )
    const targetPixelRatio = Math.max(window.devicePixelRatio || 1, MAX_ZOOM)

    return Math.max(1, Math.min(sourcePixelRatio, targetPixelRatio))
  }

  private createShape(annotation: AnnotationSnapshot, interactive: boolean): Konva.Shape {
    const attrs = { ...annotation.attrs, draggable: interactive, name: 'annotation' }

    return annotation.type === 'rectangle' ? new Konva.Rect(attrs) : new Konva.Arrow(attrs)
  }

  private bindStageDrawing(item: EditableImage): void {
    if (!this.stage || !this.annotationLayer) {
      return
    }

    this.stage.on('pointerdown', (event) => {
      if (this.currentTool === 'pan') {
        const pointer = this.getClientPointer(event.evt)
        if (pointer) {
          event.evt.preventDefault()
          this.panOrigin = {
            ...pointer,
            scrollLeft: this.canvasViewport.scrollLeft,
            scrollTop: this.canvasViewport.scrollTop,
          }
          this.updateStageCursor(true)
        }

        return
      }

      if (this.currentTool === 'move') {
        if (event.target === this.stage) {
          this.selectShape(null)
        }

        return
      }

      const position = this.stage?.getPointerPosition()
      if (!position) {
        return
      }

      this.drawingOrigin = position
      this.drawingShape =
        this.currentTool === 'rectangle'
          ? new Konva.Rect({
              x: position.x,
              y: position.y,
              width: 0,
              height: 0,
              stroke: ANNOTATION_COLOR,
              strokeWidth: ANNOTATION_STROKE,
              fill: 'transparent',
              name: 'annotation',
            })
          : new Konva.Arrow({
              points: [position.x, position.y, position.x, position.y],
              stroke: ANNOTATION_COLOR,
              fill: ANNOTATION_COLOR,
              strokeWidth: ANNOTATION_STROKE,
              pointerLength: 14,
              pointerWidth: 14,
              lineCap: 'round',
              lineJoin: 'round',
              name: 'annotation',
            })
      this.annotationLayer?.add(this.drawingShape)
    })

    this.stage.on('pointermove', (event) => {
      if (this.panOrigin) {
        const pointer = this.getClientPointer(event.evt)
        if (pointer) {
          event.evt.preventDefault()
          this.canvasViewport.scrollLeft =
            this.panOrigin.scrollLeft - (pointer.clientX - this.panOrigin.clientX)
          this.canvasViewport.scrollTop =
            this.panOrigin.scrollTop - (pointer.clientY - this.panOrigin.clientY)
        }

        return
      }

      if (!this.drawingShape || !this.drawingOrigin) {
        return
      }

      const position = this.stage?.getPointerPosition()
      if (!position) {
        return
      }

      if (this.drawingShape instanceof Konva.Rect) {
        this.drawingShape.setAttrs({
          x: Math.min(this.drawingOrigin.x, position.x),
          y: Math.min(this.drawingOrigin.y, position.y),
          width: Math.abs(position.x - this.drawingOrigin.x),
          height: Math.abs(position.y - this.drawingOrigin.y),
        })
      } else if (this.drawingShape instanceof Konva.Arrow) {
        this.drawingShape.points([
          this.drawingOrigin.x,
          this.drawingOrigin.y,
          position.x,
          position.y,
        ])
      }
    })

    this.stage.on('pointerup pointercancel', () => {
      if (this.panOrigin) {
        this.panOrigin = null
        this.updateStageCursor()

        return
      }

      if (!this.drawingShape) {
        return
      }

      const tooSmall =
        this.drawingShape instanceof Konva.Rect
          ? this.drawingShape.width() < 5 || this.drawingShape.height() < 5
          : this.drawingShape instanceof Konva.Arrow
            ? this.arrowLength(this.drawingShape) < 8
            : true

      if (tooSmall) {
        this.drawingShape.destroy()
      } else {
        this.drawingShape.draggable(true)
        this.bindShapeEvents(this.drawingShape, item)
        this.selectShape(this.drawingShape)
        this.commitAnnotations(item)
      }

      this.drawingShape = null
      this.drawingOrigin = null
      this.annotationLayer?.draw()
    })
  }

  private getClientPointer(event: Event): { clientX: number; clientY: number } | null {
    if (!('clientX' in event) || !('clientY' in event)) {
      return null
    }

    return { clientX: Number(event.clientX), clientY: Number(event.clientY) }
  }

  private bindShapeEvents(shape: Konva.Shape, item: EditableImage): void {
    shape.on('click tap', (event) => {
      event.cancelBubble = true
      if (this.currentTool === 'move') {
        this.selectShape(shape)
      }
    })
    shape.on('dragend transformend', () => this.commitAnnotations(item))
  }

  private arrowLength(arrow: Konva.Arrow): number {
    const points = arrow.points()

    return Math.hypot((points[2] ?? 0) - (points[0] ?? 0), (points[3] ?? 0) - (points[1] ?? 0))
  }

  private setTool(tool: Tool): void {
    this.currentTool = tool
    this.panOrigin = null
    this.selectShape(null)
    this.updateShapeInteractivity()

    for (const button of this.toolButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.tool === tool))
    }
  }

  private updateShapeInteractivity(): void {
    const isMovable = this.currentTool === 'move'
    for (const shape of this.annotationLayer?.find<Konva.Shape>('.annotation') ?? []) {
      shape.draggable(isMovable)
    }
    this.updateStageCursor()
  }

  private updateStageCursor(isPanning: boolean = false): void {
    if (!this.stage) {
      return
    }

    const cursor =
      this.currentTool === 'pan'
        ? isPanning
          ? 'grabbing'
          : 'grab'
        : this.currentTool === 'move'
          ? 'default'
          : 'crosshair'
    this.stage.container().style.cursor = cursor
  }

  private selectShape(shape: Konva.Shape | null): void {
    this.selectedShape = shape
    this.transformer?.nodes(shape ? [shape] : [])
    this.annotationLayer?.draw()
    this.updateControls()
  }

  private commitAnnotations(item: EditableImage): void {
    item.annotations = this.serializeAnnotations()
    const previous = item.history.at(-1) ?? []

    if (JSON.stringify(previous) !== JSON.stringify(item.annotations)) {
      item.history.push(structuredClone(item.annotations))
    }

    this.updateControls()
  }

  private serializeAnnotations(): AnnotationSnapshot[] {
    const snapshots: AnnotationSnapshot[] = []

    for (const shape of this.annotationLayer?.find<Konva.Shape>('.annotation') ?? []) {
      const common = {
        x: shape.x(),
        y: shape.y(),
        scaleX: shape.scaleX(),
        scaleY: shape.scaleY(),
        rotation: shape.rotation(),
        stroke: ANNOTATION_COLOR,
        strokeWidth: ANNOTATION_STROKE,
      }

      if (shape instanceof Konva.Rect) {
        snapshots.push({
          type: 'rectangle',
          attrs: { ...common, width: shape.width(), height: shape.height(), fill: 'transparent' },
        })
      } else if (shape instanceof Konva.Arrow) {
        snapshots.push({
          type: 'arrow',
          attrs: {
            ...common,
            points: shape.points(),
            fill: ANNOTATION_COLOR,
            pointerLength: shape.pointerLength(),
            pointerWidth: shape.pointerWidth(),
            lineCap: 'round',
            lineJoin: 'round',
          },
        })
      }
    }

    return snapshots
  }

  private undo(): void {
    const item = this.getSelectedImage()
    if (!item || item.history.length <= 1) {
      return
    }

    item.history.pop()
    item.annotations = structuredClone(item.history.at(-1) ?? [])
    this.renderSelectedImage()
  }

  private deleteSelectedShape(): void {
    const item = this.getSelectedImage()
    if (!item || !this.selectedShape) {
      return
    }

    this.selectedShape.destroy()
    this.selectShape(null)
    this.commitAnnotations(item)
    this.annotationLayer?.draw()
  }

  private async submit(event: SubmitEvent): Promise<void> {
    event.preventDefault()

    if (this.isSubmitting || !this.form.reportValidity()) {
      return
    }

    this.clearMessages()
    this.isSubmitting = true
    this.submitButton.disabled = true
    this.submitButton.textContent = this.config.labels.submitting

    try {
      if (!(await this.reporter.isAvailable())) {
        throw new Error(this.config.labels.unavailable)
      }

      const attachments: FeedbackAttachmentInput[] = []
      let totalSize = 0

      for (const item of this.images) {
        const blob = await this.exportImage(item)

        if (blob.size > MAX_FILE_SIZE) {
          throw new Error(
            this.config.labels.editedFileTooLarge.replace('{filename}', item.filename),
          )
        }

        totalSize += blob.size
        if (totalSize > MAX_TOTAL_SIZE) {
          throw new Error(this.config.labels.editedTotalTooLarge)
        }

        attachments.push({ file: blob, source: item.source, filename: item.filename })
      }

      await this.reporter.submit({
        message: this.message.value.trim(),
        attachments,
        metadata: {
          source_type: this.config.sourceType,
          route_name: this.config.routeName,
          panel_id: this.config.panelId,
          annotations: this.images.map((item) => ({
            filename: item.filename,
            edited: item.annotations.length > 0,
            count: item.annotations.length,
          })),
        },
      })

      this.resetContent()
      this.successMessage.textContent = this.config.labels.success
      this.successMessage.hidden = false
      this.successCloseTimer = window.setTimeout(() => {
        this.successCloseTimer = null
        if (this.dialog.open) {
          this.dialog.close()
        }
      }, SUCCESS_CLOSE_DELAY)
    } catch (error) {
      this.setError(this.errorText(error))
    } finally {
      this.isSubmitting = false
      this.submitButton.disabled = false
      this.submitButton.textContent = this.config.labels.submit
    }
  }

  private async exportImage(item: EditableImage): Promise<Blob> {
    if (item.annotations.length === 0) {
      return item.blob
    }

    const container = document.createElement('div')
    container.style.cssText = 'position:fixed;left:-100000px;top:0;opacity:0;pointer-events:none'
    this.root.append(container)
    const built = this.buildStage(item, container, false)

    try {
      const blob = await built.stage.toBlob({
        mimeType: item.blob.type,
        quality: 0.92,
        pixelRatio: item.naturalWidth / item.stageWidth,
      })

      if (!blob) {
        throw new Error(this.config.labels.exportFailed)
      }

      return blob
    } finally {
      built.stage.destroy()
      container.remove()
    }
  }

  private errorText(error: unknown): string {
    if (!(error instanceof Error)) {
      return this.config.labels.submitFailed
    }

    if (error.name === 'ValidationError') {
      return this.config.labels.validationFailed
    }
    if (error.name === 'RateLimitError') {
      return this.config.labels.rateLimited
    }
    if (error.name === 'AvailabilityError') {
      return this.config.labels.unavailable
    }

    return error.message || this.config.labels.submitFailed
  }

  private setError(message: string): void {
    this.successMessage.hidden = true
    this.errorMessage.textContent = message
    this.errorMessage.hidden = false
  }

  private clearMessages(): void {
    this.errorMessage.hidden = true
    this.errorMessage.textContent = ''
    this.successMessage.hidden = true
    this.successMessage.textContent = ''
  }

  private getSelectedImage(): EditableImage | null {
    return this.images.find((item) => item.id === this.selectedImageId) ?? null
  }

  private totalOriginalSize(): number {
    return this.images.reduce((total, item) => total + item.blob.size, 0)
  }

  private updateControls(): void {
    const item = this.getSelectedImage()
    this.undoButton.disabled = !item || item.history.length <= 1
    this.deleteButton.disabled = this.selectedShape === null
    this.zoomOutButton.disabled = !item || item.zoom <= MIN_ZOOM
    this.zoomInButton.disabled = !item || item.zoom >= MAX_ZOOM
    this.zoomLevel.value = `${Math.round((item?.zoom ?? 1) * 100)}%`

    for (const button of this.toolButtons) {
      button.disabled = item === null
    }
  }

  private destroyStage(): void {
    this.stage?.destroy()
    this.stage = null
    this.annotationLayer = null
    this.transformer = null
    this.selectedShape = null
    this.panOrigin = null
    this.canvasHost.replaceChildren()
    this.canvasHost.style.removeProperty('width')
    this.canvasHost.style.removeProperty('height')
  }

  private resetContent(): void {
    this.destroyStage()
    for (const item of this.images) {
      URL.revokeObjectURL(item.objectUrl)
    }
    this.images = []
    this.selectedImageId = null
    this.message.value = ''
    this.fileInput.value = ''
    this.renderThumbnails()
    this.emptyState.hidden = false
    this.canvasHost.hidden = true
  }

  private reset(): void {
    if (this.isSubmitting) {
      return
    }
    if (this.successCloseTimer !== null) {
      window.clearTimeout(this.successCloseTimer)
      this.successCloseTimer = null
    }
    this.clearMessages()
    this.resetContent()
    this.setTool('move')
  }

  public destroy(): void {
    this.reporter.destroyDiagnostics()
    if (this.successCloseTimer !== null) {
      window.clearTimeout(this.successCloseTimer)
      this.successCloseTimer = null
    }
    this.resetContent()
    if (this.dialog.open) {
      this.dialog.close()
    }
  }
}

const labels = {
  ja: {
    launcher: 'フィードバックを報告',
    eyebrow: 'Feedback report',
    title: 'フィードバックを報告',
    description: 'スクリーンショットや画像と診断情報を安全に送信します。',
    close: '閉じる',
    message: 'レポートメッセージ',
    messagePlaceholder: '何が起きたか、期待していた動作を入力してください',
    images: 'スクリーンショット・画像（任意）',
    chooseImages: '画像を選択',
    dropHint: 'またはドラッグ＆ドロップ',
    fileHint: 'PNG / JPEG / WebP・1枚5MBまで',
    attachments: '添付画像',
    removeAttachment: '添付画像「{filename}」を削除',
    move: '移動',
    pan: '手のひら',
    rectangle: '四角',
    arrow: '矢印',
    undo: '元に戻す',
    deleteSelection: '図形を削除',
    zoomOut: '画像を縮小',
    zoomIn: '画像を拡大',
    toolbar: '画像注釈ツール',
    zoomGroup: '画像の表示倍率',
    empty: 'スクリーンショットまたは画像を選択すると、ここで矢印と四角を書き込めます。',
    editorHelp: '図形の移動・リサイズ・削除や元に戻す操作は、下のボタンから行えます。',
    cancel: 'キャンセル',
    submit: 'レポートを送信',
    submitting: '送信中…',
    unavailable: '現在、この画面からレポートを送信できません。',
    fileLimit: '添付できる画像は合計5枚までです。',
    invalidType: '{filename} は有効なPNG、JPEG、WebP画像ではありません。',
    fileTooLarge: '{filename} は5MBを超えています。',
    totalTooLarge: '添付画像の合計サイズは20MBまでです。',
    editedFileTooLarge: '{filename} の編集後サイズが5MBを超えています。',
    editedTotalTooLarge: '編集後の添付画像の合計サイズが20MBを超えています。',
    exportFailed: '注釈画像を生成できませんでした。',
    submitFailed: 'レポートを送信できませんでした。時間をおいて再試行してください。',
    validationFailed: '入力内容または添付画像を確認してください。',
    rateLimited: '送信回数が上限に達しました。しばらく待ってから再試行してください。',
    success: '送信が完了しました。この画面を閉じます。',
  },
  en: {
    launcher: 'Send feedback',
    eyebrow: 'Feedback report',
    title: 'Send feedback',
    description: 'Send screenshots or images with safe diagnostic context.',
    close: 'Close',
    message: 'Feedback message',
    messagePlaceholder: 'Describe what happened and what you expected',
    images: 'Screenshots or images (optional)',
    chooseImages: 'Choose images',
    dropHint: 'or drag and drop',
    fileHint: 'PNG / JPEG / WebP · up to 5 MB each',
    attachments: 'Attached images',
    removeAttachment: 'Remove attached image {filename}',
    move: 'Move',
    pan: 'Hand tool',
    rectangle: 'Rectangle',
    arrow: 'Arrow',
    undo: 'Undo',
    deleteSelection: 'Delete shape',
    zoomOut: 'Zoom out',
    zoomIn: 'Zoom in',
    toolbar: 'Image annotation tools',
    zoomGroup: 'Image zoom',
    empty: 'Choose a screenshot or image to add arrows and rectangles here.',
    editorHelp: 'Use the controls below to move, resize, delete, or undo annotation changes.',
    cancel: 'Cancel',
    submit: 'Send report',
    submitting: 'Sending…',
    unavailable: 'Feedback reporting is currently unavailable.',
    fileLimit: 'You can attach up to 5 images.',
    invalidType: '{filename} is not a valid PNG, JPEG, or WebP image.',
    fileTooLarge: '{filename} exceeds 5 MB.',
    totalTooLarge: 'Attachments may total up to 20 MB.',
    editedFileTooLarge: '{filename} exceeds 5 MB after editing.',
    editedTotalTooLarge: 'Edited attachments exceed 20 MB in total.',
    exportFailed: 'The annotated image could not be generated.',
    submitFailed: 'The report could not be sent. Please try again later.',
    validationFailed: 'Check the message and attached images.',
    rateLimited: 'Too many reports were sent. Please try again later.',
    success: 'Your feedback was sent. This dialog will close.',
  },
} satisfies Record<'ja' | 'en', WidgetLabels>

/*!
 * Toolbar SVG paths are from Lucide Icons.
 * Lucide: Copyright (c) 2026 Lucide Icons and Contributors, ISC License.
 * Feather-derived move, square, and trash icons: Copyright (c) 2013-present Cole Bemis, MIT License.
 * License text: https://github.com/lucide-icons/lucide/blob/main/LICENSE
 */
const toolbarIcons = {
  move: '<svg class="toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v20"/><path d="m15 19-3 3-3-3"/><path d="m19 9 3 3-3 3"/><path d="M2 12h20"/><path d="m5 9-3 3 3 3"/><path d="m9 5 3-3 3 3"/></svg>',
  pan: '<svg class="toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>',
  rectangle:
    '<svg class="toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>',
  arrow:
    '<svg class="toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.207 19.793a.707.707 0 0 1-1.207-.5V16a1 1 0 0 0-1-1H5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h6a1 1 0 0 0 1-1V4.707a.707.707 0 0 1 1.207-.5l6.94 6.94a1.207 1.207 0 0 1 0 1.707z"/></svg>',
  undo: '<svg class="toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11"/></svg>',
  deleteShape:
    '<svg class="toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
} as const

function widgetTemplate(text: WidgetLabels): string {
  return `
        <style>${widgetStyles}</style>
        <div class="feedback-root">
            <button type="button" data-feedback-launcher class="launcher">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12c0 4.142 4.03 7.5 9 7.5.772 0 1.521-.081 2.235-.233A5.972 5.972 0 0 0 18 21.75a5.95 5.95 0 0 0 .966-.079 5.98 5.98 0 0 1-1.038-3.068C19.979 17.228 21.25 14.86 21.25 12c0-4.142-4.03-7.5-9-7.5s-9 3.358-9 7.5Z"/></svg>
                <span data-launcher-label>${text.launcher}</span>
            </button>
            <dialog data-feedback-dialog aria-labelledby="feedback-dialog-title">
                <form data-feedback-form>
                    <header><div><p class="eyebrow">${text.eyebrow}</p><h2 id="feedback-dialog-title">${text.title}</h2><p class="description">${text.description}</p></div><button type="button" data-feedback-close class="icon-button" aria-label="${text.close}">✕</button></header>
                    <div class="body">
                        <section class="sidebar">
                            <label class="field"><span>${text.message} <b>*</b></span><textarea data-feedback-message required maxlength="10000" rows="6" placeholder="${text.messagePlaceholder}"></textarea></label>
                            <div class="field"><span>${text.images}</span><label data-feedback-dropzone class="dropzone"><span class="plus" aria-hidden="true">＋</span><span><strong>${text.chooseImages}</strong> ${text.dropHint}</span><small>${text.fileHint}</small><input data-feedback-files type="file" accept="image/png,image/jpeg,image/webp" multiple></label></div>
                            <div><div class="attachment-heading"><span>${text.attachments}</span><span data-feedback-count>0 / 5</span></div><div data-feedback-thumbnails class="thumbnails"></div><template data-feedback-thumbnail-template><div data-feedback-thumbnail class="thumbnail"><button type="button" data-feedback-thumbnail-select class="thumbnail-select"><img data-thumbnail-image alt=""><span data-thumbnail-label></span></button><button type="button" data-feedback-remove-image class="thumbnail-remove"></button></div></template></div>
                        </section>
                        <section class="editor">
                            <div data-feedback-viewport class="viewport"><div class="viewport-inner"><p data-feedback-empty>${text.empty}</p><div data-feedback-canvas class="canvas-host"></div></div></div>
                            <div class="editor-controls">
                                <p class="help">${text.editorHelp}</p>
                                <div class="toolbar" role="toolbar" aria-label="${text.toolbar}">
                                    <button type="button" data-tool="move" aria-pressed="true">${toolbarIcons.move}<span>${text.move}</span></button><button type="button" data-tool="pan" aria-pressed="false">${toolbarIcons.pan}<span>${text.pan}</span></button><button type="button" data-tool="rectangle" aria-pressed="false">${toolbarIcons.rectangle}<span>${text.rectangle}</span></button><button type="button" data-tool="arrow" aria-pressed="false">${toolbarIcons.arrow}<span>${text.arrow}</span></button>
                                    <span class="separator" aria-hidden="true"></span><button type="button" data-feedback-undo>${toolbarIcons.undo}<span>${text.undo}</span></button><button type="button" data-feedback-delete class="danger">${toolbarIcons.deleteShape}<span>${text.deleteSelection}</span></button>
                                    <span class="separator" aria-hidden="true"></span><div data-feedback-zoom-controls class="zoom" role="group" aria-label="${text.zoomGroup}"><button type="button" data-feedback-zoom-out aria-label="${text.zoomOut}">−</button><output data-feedback-zoom-level aria-live="polite">100%</output><button type="button" data-feedback-zoom-in aria-label="${text.zoomIn}">＋</button></div>
                                </div>
                            </div>
                        </section>
                    </div>
                    <footer><div aria-live="polite" class="messages"><p data-feedback-error hidden></p><p data-feedback-success role="status" hidden></p></div><div class="footer-actions"><button type="button" data-feedback-cancel>${text.cancel}</button><button type="submit" data-feedback-submit class="primary">${text.submit}</button></div></footer>
                </form>
            </dialog>
        </div>
    `
}

export class FeedbackReporterElement extends HTMLElement {
  private controller: WidgetController | null = null
  private widgetConfig: FeedbackReporterWidgetConfig = {}

  public set config(config: FeedbackReporterWidgetConfig) {
    this.widgetConfig = config
  }

  public get config(): FeedbackReporterWidgetConfig {
    return this.widgetConfig
  }

  public connectedCallback(): void {
    if (this.controller) {
      return
    }

    const locale = (this.lang || document.documentElement.lang).toLowerCase().startsWith('ja')
      ? 'ja'
      : 'en'
    const root = this.shadowRoot ?? this.attachShadow({ mode: 'open' })
    root.innerHTML = widgetTemplate(labels[locale])
    this.controller = new WidgetController(root, {
      endpoint: this.getAttribute('endpoint') ?? this.widgetConfig.endpoint,
      availabilityEndpoint:
        this.getAttribute('availability-endpoint') ?? this.widgetConfig.availabilityEndpoint,
      sourceType: this.getAttribute('source-type') ?? this.widgetConfig.sourceType ?? 'web_site',
      routeName: this.getAttribute('route-name') ?? this.widgetConfig.routeName ?? null,
      panelId: this.getAttribute('panel-id') ?? this.widgetConfig.panelId ?? null,
      reporter: this.widgetConfig.reporter,
      labels: labels[locale],
    })
  }

  public disconnectedCallback(): void {
    this.controller?.destroy()
    this.controller = null
  }

  public async open(): Promise<void> {
    await this.controller?.open()
  }

  public close(): void {
    this.controller?.close()
  }
}

const registeredElementConstructors = new Map<string, CustomElementConstructor>()

export function registerFeedbackReporterElement(tagName: string = 'trust-feedback-reporter'): void {
  const current = customElements.get(tagName)
  const registered = registeredElementConstructors.get(tagName)

  if (current && current !== registered) {
    throw new Error(`Custom element "${tagName}" is already registered.`)
  }
  if (current) {
    return
  }

  const elementConstructor: CustomElementConstructor =
    tagName === 'trust-feedback-reporter'
      ? FeedbackReporterElement
      : class extends FeedbackReporterElement {}

  customElements.define(tagName, elementConstructor)
  registeredElementConstructors.set(tagName, elementConstructor)
}
