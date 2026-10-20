import { C as AvailabilityError, b as DEFAULT_LIMITS, c as createId, n as createFeedbackReporter, x as resolveLimits } from "./reporter-C-zwQXFf.js";
import Konva from "konva";

//#region resources/js/widget-styles.ts
const widgetStyles = `
    :host {
        all: initial;
        color-scheme: light dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        --fbr-bg: #fff;
        --fbr-panel: #f3f4f6;
        --fbr-text: #111827;
        --fbr-muted: #6b7280;
        --fbr-border: #d1d5db;
        --fbr-accent: #e11d48;
        --fbr-accent-hover: #f43f5e;
        --fbr-overlay: rgb(15 23 42 / 75%);
    }
    :host([color-scheme="dark"]) {
        --fbr-bg: #030712;
        --fbr-panel: #111827;
        --fbr-text: #fff;
        --fbr-muted: #9ca3af;
        --fbr-border: #374151;
    }
    @media (prefers-color-scheme: dark) {
        :host(:not([color-scheme="light"])) {
            --fbr-bg: #030712;
            --fbr-panel: #111827;
            --fbr-text: #fff;
            --fbr-muted: #9ca3af;
            --fbr-border: #374151;
        }
    }
    *, *::before, *::after { box-sizing: border-box; }
    [hidden] { display: none !important; }
    button, textarea, input { font: inherit; }
    button { color: inherit; }
    .feedback-root { position: fixed; inset: auto auto max(1.25rem, env(safe-area-inset-bottom)) max(1.25rem, env(safe-area-inset-left)); z-index: 2147483000; }
    .launcher { display: inline-flex; align-items: center; gap: .5rem; border: 0; border-radius: 9999px; background: var(--fbr-accent); color: #fff; padding: .75rem 1.25rem; font-size: .875rem; font-weight: 700; box-shadow: 0 18px 40px rgb(76 5 25 / 30%); cursor: pointer; transition: transform .15s, background .15s; }
    .launcher:hover { background: var(--fbr-accent-hover); transform: translateY(-2px); }
    .launcher:focus-visible, button:focus-visible, textarea:focus-visible, .dropzone:focus-within { outline: 2px solid var(--fbr-accent); outline-offset: 2px; }
    .launcher:disabled { cursor: wait; opacity: .65; }
    .launcher svg { width: 1.25rem; height: 1.25rem; }
    dialog { width: min(72rem, calc(100vw - 2rem)); max-width: none; height: min(48rem, calc(100dvh - 2rem)); max-height: none; margin: auto; padding: 0; overflow: hidden; border: 1px solid var(--fbr-border); border-radius: 1rem; background: var(--fbr-bg); color: var(--fbr-text); box-shadow: 0 25px 60px rgb(0 0 0 / 35%); }
    dialog::backdrop { background: var(--fbr-overlay); }
    form { display: flex; height: 100%; min-height: 0; flex-direction: column; }
    header, footer { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; padding: 1rem 1.5rem; border-color: var(--fbr-border); }
    header { border-bottom: 1px solid var(--fbr-border); }
    footer { align-items: center; border-top: 1px solid var(--fbr-border); }
    h2, p { margin: 0; }
    h2 { margin-top: .25rem; font-size: 1.25rem; line-height: 1.5; }
    .eyebrow { color: var(--fbr-accent); font-size: .75rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
    .description, .help { margin-top: .25rem; color: var(--fbr-muted); font-size: .875rem; }
    .icon-button { border: 0; border-radius: .5rem; background: transparent; padding: .5rem; color: var(--fbr-muted); cursor: pointer; }
    .icon-button:hover, .toolbar button:hover, .footer-actions button:not(.primary):hover { background: color-mix(in srgb, var(--fbr-panel) 85%, transparent); }
    .body { display: grid; min-height: 0; flex: 1; grid-template-columns: 22rem minmax(0, 1fr); overflow: hidden; }
    .sidebar { display: flex; flex-direction: column; gap: 1.25rem; overflow-y: auto; padding: 1.5rem; border-right: 1px solid var(--fbr-border); }
    .field { display: grid; gap: .5rem; color: var(--fbr-text); font-size: .875rem; font-weight: 600; }
    .field b, .dropzone strong, .danger { color: var(--fbr-accent); }
    textarea { min-height: 8rem; resize: vertical; border: 1px solid var(--fbr-border); border-radius: .75rem; background: var(--fbr-bg); color: var(--fbr-text); padding: .625rem .75rem; font-size: .875rem; box-shadow: 0 1px 2px rgb(0 0 0 / 6%); }
    textarea::placeholder { color: var(--fbr-muted); }
    .dropzone { display: grid; place-items: center; gap: .5rem; border: 2px dashed var(--fbr-border); border-radius: .75rem; padding: 1.5rem 1rem; color: var(--fbr-muted); text-align: center; cursor: pointer; transition: border-color .15s, background .15s; }
    .dropzone:hover, .dropzone[data-dragging="true"] { border-color: var(--fbr-accent); background: color-mix(in srgb, var(--fbr-accent) 8%, transparent); }
    .dropzone[data-disabled="true"] { opacity: .5; cursor: not-allowed; pointer-events: none; }
    .dropzone input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    .plus { font-size: 1.5rem; }
    .dropzone small { font-size: .75rem; font-weight: 400; }
    .attachment-heading { display: flex; align-items: center; justify-content: space-between; gap: .75rem; font-size: .875rem; font-weight: 600; }
    [data-feedback-count] { color: var(--fbr-muted); font-size: .75rem; font-weight: 400; }
    .thumbnails { display: grid; grid-template-columns: repeat(3, 1fr); gap: .5rem; margin-top: .75rem; }
    .thumbnail { position: relative; min-width: 0; border-radius: .5rem; background: var(--fbr-panel); }
    .thumbnail[data-selected="true"] { outline: 2px solid var(--fbr-accent); }
    .thumbnail-select { display: block; width: 100%; overflow: hidden; padding: 0; border: 0; border-radius: .5rem; background: transparent; cursor: pointer; }
    .thumbnail img { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; }
    .thumbnail span { position: absolute; inset: auto 0 0; overflow: hidden; padding: .25rem .375rem; background: rgb(15 23 42 / 75%); color: #fff; font-size: .625rem; text-align: left; text-overflow: ellipsis; white-space: nowrap; }
    .thumbnail-remove { position: absolute; z-index: 1; inset: .25rem .25rem auto auto; display: grid; width: 1.75rem; height: 1.75rem; place-items: center; padding: 0; border: 1px solid rgb(255 255 255 / 65%); border-radius: 9999px; background: rgb(15 23 42 / 82%); color: #fff; font-size: 0; cursor: pointer; }
    .thumbnail-remove::before { content: "×"; font-size: 1rem; line-height: 1; }
    .thumbnail-remove:hover { background: var(--fbr-accent); }
    .editor { display: flex; min-height: 0; min-width: 0; flex-direction: column; gap: 1rem; overflow: hidden; padding: 1.5rem; }
    .editor-controls { display: grid; flex: none; gap: .5rem; }
    .toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: .25rem; }
    .toolbar button, .footer-actions button { border: 1px solid var(--fbr-border); border-radius: .5rem; background: transparent; padding: .5rem .75rem; font-size: .875rem; font-weight: 600; cursor: pointer; }
    .toolbar button { display: inline-flex; align-items: center; justify-content: center; gap: .375rem; }
    .toolbar-icon { width: 1rem; height: 1rem; flex: none; }
    .toolbar button[aria-pressed="true"], .primary { border-color: var(--fbr-accent) !important; background: var(--fbr-accent) !important; color: #fff !important; }
    button:disabled { cursor: not-allowed; opacity: .4; }
    .separator { width: 1px; height: 1.5rem; margin: 0 .25rem; background: var(--fbr-border); }
    .zoom { display: inline-flex; overflow: hidden; border: 1px solid var(--fbr-border); border-radius: .5rem; }
    .zoom button { border: 0; border-radius: 0; }
    .zoom output { min-width: 3.5rem; padding: .5rem; border-inline: 1px solid var(--fbr-border); color: var(--fbr-text); font-size: .75rem; font-weight: 700; text-align: center; }
    .viewport { position: relative; min-width: 0; min-height: 0; flex: 1; overflow: auto; overscroll-behavior: contain; border-radius: .75rem; background: var(--fbr-panel); padding: .75rem; scrollbar-gutter: stable; }
    .viewport-inner { display: grid; width: max-content; min-width: 100%; height: max-content; min-height: 100%; place-items: center; }
    [data-feedback-empty] { max-width: 24rem; color: var(--fbr-muted); font-size: .875rem; line-height: 1.5rem; text-align: center; }
    .canvas-host { overflow: hidden; border-radius: .5rem; background: #fff; box-shadow: 0 12px 30px rgb(0 0 0 / 18%); }
    .help { margin: 0; font-size: .75rem; }
    .messages { min-height: 1.25rem; font-size: .875rem; }
    [data-feedback-error] { color: #dc2626; }
    [data-feedback-success] { color: #059669; }
    .footer-actions { display: flex; justify-content: flex-end; gap: .75rem; }
    .primary { padding-inline: 1.25rem !important; box-shadow: 0 8px 20px rgb(225 29 72 / 20%); }
    @media (max-width: 900px) {
        dialog { width: calc(100vw - 1rem); height: calc(100dvh - 1rem); }
        .body { grid-template-columns: 1fr; overflow-y: auto; }
        .sidebar { overflow: visible; border-right: 0; border-bottom: 1px solid var(--fbr-border); }
        .editor { min-height: 32rem; overflow: visible; }
        .viewport { flex-basis: 24rem; }
    }
    @media (max-width: 560px) {
        .feedback-root { inset: auto .75rem max(.75rem, env(safe-area-inset-bottom)) auto; }
        .launcher { padding: .625rem 1rem; }
        header, .sidebar, .editor, footer { padding: 1rem; }
        footer { align-items: stretch; flex-direction: column; }
        .footer-actions { width: 100%; }
        .footer-actions button { flex: 1; }
        .separator { display: none; }
    }
`;

//#endregion
//#region resources/js/widget.ts
const ANNOTATION_COLOR = "#e11d48";
const ANNOTATION_STROKE = 4;
const MIN_ZOOM = .5;
const MAX_ZOOM = 2;
const ZOOM_STEP = .25;
const SUCCESS_CLOSE_DELAY = 1500;
function formatMegabytes(kilobytes) {
	const megabytes = kilobytes / 1024;
	return Number.isInteger(megabytes) ? String(megabytes) : megabytes.toFixed(1);
}
function mimeLabel(mime) {
	const subtype = mime.split("/")[1] ?? mime;
	return subtype === "jpeg" ? "JPEG" : subtype === "webp" ? "WebP" : subtype.toUpperCase();
}
/** Fill `{placeholders}` in a label with the current limits and extra values. */
function formatLabel(template, limits, extra = {}) {
	const values = {
		maxFiles: String(limits.maxFiles),
		maxFileSize: formatMegabytes(limits.maxFileSizeKb),
		maxTotalSize: formatMegabytes(limits.maxTotalSizeKb),
		types: limits.allowedMimes.map(mimeLabel).join(" / "),
		...extra
	};
	return template.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
}
var WidgetController = class {
	root;
	config;
	reporter;
	dialog;
	launcher;
	form;
	message;
	fileInput;
	dropzone;
	thumbnails;
	thumbnailTemplate;
	count;
	canvasViewport;
	canvasHost;
	emptyState;
	errorMessage;
	successMessage;
	submitButton;
	undoButton;
	deleteButton;
	zoomOutButton;
	zoomInButton;
	zoomLevel;
	toolButtons;
	images = [];
	selectedImageId = null;
	currentTool = "move";
	stage = null;
	annotationLayer = null;
	transformer = null;
	selectedShape = null;
	drawingShape = null;
	drawingOrigin = null;
	panOrigin = null;
	isSubmitting = false;
	successCloseTimer = null;
	limits = resolveLimits();
	clientReportId = createId();
	submitController = null;
	/** Incremented on reset so in-flight async work can detect that it is stale. */
	generation = 0;
	pendingFiles = 0;
	pendingBytes = 0;
	fileHint;
	constructor(root, config) {
		this.root = root;
		this.config = config;
		this.dialog = this.requireElement("[data-feedback-dialog]");
		this.launcher = this.requireElement("[data-feedback-launcher]");
		this.form = this.requireElement("[data-feedback-form]");
		this.message = this.requireElement("[data-feedback-message]");
		this.fileInput = this.requireElement("[data-feedback-files]");
		this.dropzone = this.requireElement("[data-feedback-dropzone]");
		this.thumbnails = this.requireElement("[data-feedback-thumbnails]");
		this.thumbnailTemplate = this.requireElement("[data-feedback-thumbnail-template]");
		this.count = this.requireElement("[data-feedback-count]");
		this.canvasViewport = this.requireElement("[data-feedback-viewport]");
		this.canvasHost = this.requireElement("[data-feedback-canvas]");
		this.emptyState = this.requireElement("[data-feedback-empty]");
		this.errorMessage = this.requireElement("[data-feedback-error]");
		this.successMessage = this.requireElement("[data-feedback-success]");
		this.submitButton = this.requireElement("[data-feedback-submit]");
		this.undoButton = this.requireElement("[data-feedback-undo]");
		this.deleteButton = this.requireElement("[data-feedback-delete]");
		this.zoomOutButton = this.requireElement("[data-feedback-zoom-out]");
		this.zoomInButton = this.requireElement("[data-feedback-zoom-in]");
		this.zoomLevel = this.requireElement("[data-feedback-zoom-level]");
		this.toolButtons = Array.from(this.root.querySelectorAll("[data-tool]"));
		this.fileHint = this.requireElement("[data-feedback-file-hint]");
		this.reporter = createFeedbackReporter({
			...this.config.reporter,
			endpoint: this.config.endpoint,
			availabilityEndpoint: this.config.availabilityEndpoint
		});
		this.bindEvents();
		this.applyLimits();
		this.updateControls();
	}
	requireElement(selector) {
		const element = this.root.querySelector(selector);
		if (!element) throw new Error(`Feedback reporter element is missing: ${selector}`);
		return element;
	}
	bindEvents() {
		this.launcher.addEventListener("click", () => void this.open());
		this.form.addEventListener("submit", (event) => void this.submit(event));
		this.root.querySelector("[data-feedback-close]")?.addEventListener("click", () => this.close());
		this.root.querySelector("[data-feedback-cancel]")?.addEventListener("click", () => this.close());
		this.fileInput.addEventListener("change", () => void this.addFiles(this.fileInput.files));
		this.undoButton.addEventListener("click", () => this.undo());
		this.deleteButton.addEventListener("click", () => this.deleteSelectedShape());
		this.zoomOutButton.addEventListener("click", () => this.zoomBy(-.25));
		this.zoomInButton.addEventListener("click", () => this.zoomBy(ZOOM_STEP));
		this.dialog.addEventListener("close", () => this.reset());
		for (const toolButton of this.toolButtons) toolButton.addEventListener("click", () => this.setTool(toolButton.dataset.tool));
		for (const eventName of ["dragenter", "dragover"]) this.dropzone.addEventListener(eventName, (event) => {
			event.preventDefault();
			this.dropzone.dataset.dragging = "true";
		});
		for (const eventName of ["dragleave", "drop"]) this.dropzone.addEventListener(eventName, (event) => {
			event.preventDefault();
			delete this.dropzone.dataset.dragging;
		});
		this.dropzone.addEventListener("drop", (event) => {
			if (event instanceof DragEvent && !this.fileInput.disabled) this.addFiles(event.dataTransfer?.files ?? null);
		});
	}
	async open() {
		this.clearMessages();
		this.launcher.disabled = true;
		try {
			const availability = await this.reporter.getAvailability();
			if (!availability.available) {
				this.setFormDisabled(true);
				this.setError(this.config.labels.unavailable);
				await this.showDialog();
				return;
			}
			this.setFormDisabled(false);
			this.applyLimits(availability.limits);
			await this.showDialog();
		} catch (error) {
			this.setFormDisabled(false);
			this.setError(this.errorText(error));
			await this.showDialog();
		} finally {
			this.launcher.disabled = false;
		}
	}
	close() {
		this.abortSubmit();
		if (this.dialog.open) this.dialog.close();
	}
	abortSubmit() {
		this.submitController?.abort();
		this.submitController = null;
	}
	applyLimits(limits) {
		this.limits = limits ?? this.reporter.getLimits();
		this.fileInput.accept = this.limits.allowedMimes.join(",");
		this.message.maxLength = this.limits.maxMessageLength;
		this.fileHint.textContent = formatLabel(this.config.labels.fileHint, this.limits);
		this.count.textContent = `${this.images.length} / ${this.limits.maxFiles}`;
	}
	setFormDisabled(disabled) {
		this.message.disabled = disabled;
		this.fileInput.disabled = disabled;
		this.submitButton.disabled = disabled;
		if (disabled) this.dropzone.dataset.disabled = "true";
		else delete this.dropzone.dataset.disabled;
	}
	async showDialog() {
		if (!this.dialog.open) this.dialog.showModal();
		await new Promise((resolve) => requestAnimationFrame(() => resolve()));
		const item = this.getSelectedImage();
		if (item) {
			const dimensions = this.getStageDimensions(item.image);
			item.stageWidth = dimensions.width;
			item.stageHeight = dimensions.height;
			item.zoom = 1;
			this.renderSelectedImage();
		}
		if (!this.message.disabled) this.message.focus();
	}
	async addFiles(files) {
		if (!files) return;
		this.clearMessages();
		const labels = this.config.labels;
		const maxFileSize = this.limits.maxFileSizeKb * 1024;
		const maxTotalSize = this.limits.maxTotalSizeKb * 1024;
		const selected = Array.from(files);
		this.fileInput.value = "";
		for (const file of selected) {
			if (this.images.length + this.pendingFiles >= this.limits.maxFiles) {
				this.setError(formatLabel(labels.fileLimit, this.limits));
				break;
			}
			if (!this.limits.allowedMimes.includes(file.type)) {
				this.setError(formatLabel(labels.invalidType, this.limits, { filename: file.name }));
				continue;
			}
			if (file.size > maxFileSize) {
				this.setError(formatLabel(labels.fileTooLarge, this.limits, { filename: file.name }));
				continue;
			}
			if (this.totalOriginalSize() + this.pendingBytes + file.size > maxTotalSize) {
				this.setError(formatLabel(labels.totalTooLarge, this.limits));
				break;
			}
			this.pendingFiles += 1;
			this.pendingBytes += file.size;
			const generation = this.generation;
			try {
				await this.addImage(file, file.name, "attachment", generation);
			} catch {
				if (generation === this.generation) this.setError(formatLabel(labels.invalidType, this.limits, { filename: file.name }));
			} finally {
				if (generation === this.generation) {
					this.pendingFiles -= 1;
					this.pendingBytes -= file.size;
				}
			}
		}
	}
	async addImage(blob, filename, source, generation = this.generation) {
		const objectUrl = URL.createObjectURL(blob);
		try {
			const image = await this.loadImage(objectUrl);
			if (generation !== this.generation) {
				URL.revokeObjectURL(objectUrl);
				return;
			}
			const dimensions = this.getStageDimensions(image);
			const editableImage = {
				id: createId(),
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
				history: [[]]
			};
			this.images.push(editableImage);
			this.selectedImageId = editableImage.id;
			this.renderThumbnails();
			this.renderSelectedImage();
		} catch (error) {
			URL.revokeObjectURL(objectUrl);
			throw error;
		}
	}
	loadImage(url) {
		return new Promise((resolve, reject) => {
			const image = new Image();
			image.onload = () => resolve(image);
			image.onerror = () => reject(/* @__PURE__ */ new Error("Image could not be loaded."));
			image.src = url;
		});
	}
	getStageDimensions(image) {
		const viewportSize = this.getViewportAvailableSize();
		const availableWidth = this.canvasViewport.clientWidth > 0 ? viewportSize.width : Math.min(900, image.naturalWidth);
		const scale = Math.min(1, availableWidth / image.naturalWidth);
		return {
			width: Math.max(1, Math.round(image.naturalWidth * scale)),
			height: Math.max(1, Math.round(image.naturalHeight * scale))
		};
	}
	getViewportAvailableSize() {
		const styles = getComputedStyle(this.canvasViewport);
		const horizontalPadding = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
		const verticalPadding = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
		return {
			width: Math.max(1, this.canvasViewport.clientWidth - horizontalPadding),
			height: Math.max(1, this.canvasViewport.clientHeight - verticalPadding)
		};
	}
	renderThumbnails() {
		this.thumbnails.replaceChildren();
		for (const item of this.images) {
			const fragment = this.thumbnailTemplate.content.cloneNode(true);
			const thumbnail = fragment.querySelector("[data-feedback-thumbnail]");
			const selectButton = fragment.querySelector("[data-feedback-thumbnail-select]");
			const removeButton = fragment.querySelector("[data-feedback-remove-image]");
			const image = fragment.querySelector("[data-thumbnail-image]");
			const label = fragment.querySelector("[data-thumbnail-label]");
			if (!thumbnail || !selectButton || !removeButton || !image || !label) continue;
			const isSelected = item.id === this.selectedImageId;
			thumbnail.dataset.selected = String(isSelected);
			if (isSelected) selectButton.setAttribute("aria-current", "true");
			image.src = item.objectUrl;
			image.alt = item.filename;
			label.textContent = item.filename;
			removeButton.setAttribute("aria-label", this.config.labels.removeAttachment.replace("{filename}", item.filename));
			selectButton.addEventListener("click", () => {
				this.selectedImageId = item.id;
				this.renderThumbnails();
				this.renderSelectedImage();
			});
			removeButton.addEventListener("click", () => this.removeImage(item.id));
			this.thumbnails.append(fragment);
		}
		this.count.textContent = `${this.images.length} / ${this.limits.maxFiles}`;
		this.updateControls();
	}
	removeImage(imageId) {
		const index = this.images.findIndex((item) => item.id === imageId);
		if (index === -1) return;
		const [removed] = this.images.splice(index, 1);
		if (removed) URL.revokeObjectURL(removed.objectUrl);
		if (this.selectedImageId === imageId) {
			this.selectedImageId = this.images[Math.min(index, this.images.length - 1)]?.id ?? null;
			this.renderSelectedImage();
		}
		this.renderThumbnails();
	}
	renderSelectedImage() {
		this.destroyStage();
		const item = this.getSelectedImage();
		this.emptyState.hidden = item !== null;
		this.canvasHost.hidden = item === null;
		if (!item) {
			this.updateControls();
			return;
		}
		const built = this.buildStage(item, this.canvasHost, true);
		this.stage = built.stage;
		this.annotationLayer = built.annotationLayer;
		this.transformer = built.transformer;
		this.selectedShape = null;
		this.bindStageDrawing(item);
		this.updateShapeInteractivity();
		this.applyZoom(item);
		this.updateControls();
	}
	applyZoom(item) {
		if (!this.stage) return;
		const content = this.stage.getContent();
		content.style.transformOrigin = "top left";
		content.style.transform = `scale(${item.zoom})`;
		this.canvasHost.style.width = `${item.stageWidth * item.zoom}px`;
		this.canvasHost.style.height = `${item.stageHeight * item.zoom}px`;
	}
	zoomBy(change) {
		const item = this.getSelectedImage();
		if (!item) return;
		const nextZoom = change < 0 ? Math.max(MIN_ZOOM, item.zoom + change) : Math.min(MAX_ZOOM, item.zoom + change);
		this.setZoom(item, nextZoom);
	}
	setZoom(item, zoom) {
		item.zoom = Number(zoom.toFixed(4));
		this.applyZoom(item);
		this.updateControls();
	}
	buildStage(item, container, interactive) {
		container.replaceChildren();
		const stage = new Konva.Stage({
			container,
			width: item.stageWidth,
			height: item.stageHeight
		});
		const backgroundLayer = new Konva.Layer({ listening: false });
		backgroundLayer.add(new Konva.Image({
			image: item.image,
			width: item.stageWidth,
			height: item.stageHeight
		}));
		stage.add(backgroundLayer);
		const annotationLayer = new Konva.Layer();
		for (const annotation of item.annotations) annotationLayer.add(this.createShape(annotation, interactive));
		stage.add(annotationLayer);
		let transformer = null;
		if (interactive) {
			transformer = new Konva.Transformer({
				rotateEnabled: false,
				flipEnabled: false,
				borderStroke: ANNOTATION_COLOR,
				anchorStroke: ANNOTATION_COLOR,
				anchorFill: "#ffffff",
				anchorSize: 9
			});
			annotationLayer.add(transformer);
			for (const shape of annotationLayer.find(".annotation")) this.bindShapeEvents(shape, item);
		}
		const renderPixelRatio = interactive ? this.getRenderPixelRatio(item) : 1;
		backgroundLayer.getCanvas().setPixelRatio(renderPixelRatio);
		annotationLayer.getCanvas().setPixelRatio(renderPixelRatio);
		annotationLayer.getHitCanvas().setPixelRatio(renderPixelRatio);
		backgroundLayer.draw();
		annotationLayer.draw();
		return {
			stage,
			annotationLayer,
			transformer
		};
	}
	getRenderPixelRatio(item) {
		const sourcePixelRatio = Math.min(item.naturalWidth / item.stageWidth, item.naturalHeight / item.stageHeight);
		const targetPixelRatio = Math.max(window.devicePixelRatio || 1, MAX_ZOOM);
		return Math.max(1, Math.min(sourcePixelRatio, targetPixelRatio));
	}
	createShape(annotation, interactive) {
		const attrs = {
			...annotation.attrs,
			draggable: interactive,
			name: "annotation"
		};
		return annotation.type === "rectangle" ? new Konva.Rect(attrs) : new Konva.Arrow(attrs);
	}
	bindStageDrawing(item) {
		if (!this.stage || !this.annotationLayer) return;
		this.stage.on("pointerdown", (event) => {
			if (this.currentTool === "pan") {
				const pointer = this.getClientPointer(event.evt);
				if (pointer) {
					event.evt.preventDefault();
					this.panOrigin = {
						...pointer,
						scrollLeft: this.canvasViewport.scrollLeft,
						scrollTop: this.canvasViewport.scrollTop
					};
					this.updateStageCursor(true);
				}
				return;
			}
			if (this.currentTool === "move") {
				if (event.target === this.stage) this.selectShape(null);
				return;
			}
			const position = this.stage?.getPointerPosition();
			if (!position) return;
			this.drawingOrigin = position;
			this.drawingShape = this.currentTool === "rectangle" ? new Konva.Rect({
				x: position.x,
				y: position.y,
				width: 0,
				height: 0,
				stroke: ANNOTATION_COLOR,
				strokeWidth: ANNOTATION_STROKE,
				fill: "transparent",
				name: "annotation"
			}) : new Konva.Arrow({
				points: [
					position.x,
					position.y,
					position.x,
					position.y
				],
				stroke: ANNOTATION_COLOR,
				fill: ANNOTATION_COLOR,
				strokeWidth: ANNOTATION_STROKE,
				pointerLength: 14,
				pointerWidth: 14,
				lineCap: "round",
				lineJoin: "round",
				name: "annotation"
			});
			this.annotationLayer?.add(this.drawingShape);
		});
		this.stage.on("pointermove", (event) => {
			if (this.panOrigin) {
				const pointer = this.getClientPointer(event.evt);
				if (pointer) {
					event.evt.preventDefault();
					this.canvasViewport.scrollLeft = this.panOrigin.scrollLeft - (pointer.clientX - this.panOrigin.clientX);
					this.canvasViewport.scrollTop = this.panOrigin.scrollTop - (pointer.clientY - this.panOrigin.clientY);
				}
				return;
			}
			if (!this.drawingShape || !this.drawingOrigin) return;
			const position = this.stage?.getPointerPosition();
			if (!position) return;
			if (this.drawingShape instanceof Konva.Rect) this.drawingShape.setAttrs({
				x: Math.min(this.drawingOrigin.x, position.x),
				y: Math.min(this.drawingOrigin.y, position.y),
				width: Math.abs(position.x - this.drawingOrigin.x),
				height: Math.abs(position.y - this.drawingOrigin.y)
			});
			else if (this.drawingShape instanceof Konva.Arrow) this.drawingShape.points([
				this.drawingOrigin.x,
				this.drawingOrigin.y,
				position.x,
				position.y
			]);
		});
		this.stage.on("pointerup pointercancel", () => {
			if (this.panOrigin) {
				this.panOrigin = null;
				this.updateStageCursor();
				return;
			}
			if (!this.drawingShape) return;
			if (this.drawingShape instanceof Konva.Rect ? this.drawingShape.width() < 5 || this.drawingShape.height() < 5 : this.drawingShape instanceof Konva.Arrow ? this.arrowLength(this.drawingShape) < 8 : true) this.drawingShape.destroy();
			else {
				this.drawingShape.draggable(true);
				this.bindShapeEvents(this.drawingShape, item);
				this.selectShape(this.drawingShape);
				this.commitAnnotations(item);
			}
			this.drawingShape = null;
			this.drawingOrigin = null;
			this.annotationLayer?.draw();
		});
	}
	getClientPointer(event) {
		if (!("clientX" in event) || !("clientY" in event)) return null;
		return {
			clientX: Number(event.clientX),
			clientY: Number(event.clientY)
		};
	}
	bindShapeEvents(shape, item) {
		shape.on("click tap", (event) => {
			event.cancelBubble = true;
			if (this.currentTool === "move") this.selectShape(shape);
		});
		shape.on("dragend transformend", () => this.commitAnnotations(item));
	}
	arrowLength(arrow) {
		const points = arrow.points();
		return Math.hypot((points[2] ?? 0) - (points[0] ?? 0), (points[3] ?? 0) - (points[1] ?? 0));
	}
	setTool(tool) {
		this.currentTool = tool;
		this.panOrigin = null;
		this.selectShape(null);
		this.updateShapeInteractivity();
		for (const button of this.toolButtons) button.setAttribute("aria-pressed", String(button.dataset.tool === tool));
	}
	updateShapeInteractivity() {
		const isMovable = this.currentTool === "move";
		for (const shape of this.annotationLayer?.find(".annotation") ?? []) shape.draggable(isMovable);
		this.updateStageCursor();
	}
	updateStageCursor(isPanning = false) {
		if (!this.stage) return;
		const cursor = this.currentTool === "pan" ? isPanning ? "grabbing" : "grab" : this.currentTool === "move" ? "default" : "crosshair";
		this.stage.container().style.cursor = cursor;
	}
	selectShape(shape) {
		this.selectedShape = shape;
		this.transformer?.nodes(shape ? [shape] : []);
		this.annotationLayer?.draw();
		this.updateControls();
	}
	commitAnnotations(item) {
		item.annotations = this.serializeAnnotations();
		const previous = item.history.at(-1) ?? [];
		if (JSON.stringify(previous) !== JSON.stringify(item.annotations)) item.history.push(structuredClone(item.annotations));
		this.updateControls();
	}
	serializeAnnotations() {
		const snapshots = [];
		for (const shape of this.annotationLayer?.find(".annotation") ?? []) {
			const common = {
				x: shape.x(),
				y: shape.y(),
				scaleX: shape.scaleX(),
				scaleY: shape.scaleY(),
				rotation: shape.rotation(),
				stroke: ANNOTATION_COLOR,
				strokeWidth: ANNOTATION_STROKE
			};
			if (shape instanceof Konva.Rect) snapshots.push({
				type: "rectangle",
				attrs: {
					...common,
					width: shape.width(),
					height: shape.height(),
					fill: "transparent"
				}
			});
			else if (shape instanceof Konva.Arrow) snapshots.push({
				type: "arrow",
				attrs: {
					...common,
					points: shape.points(),
					fill: ANNOTATION_COLOR,
					pointerLength: shape.pointerLength(),
					pointerWidth: shape.pointerWidth(),
					lineCap: "round",
					lineJoin: "round"
				}
			});
		}
		return snapshots;
	}
	undo() {
		const item = this.getSelectedImage();
		if (!item || item.history.length <= 1) return;
		item.history.pop();
		item.annotations = structuredClone(item.history.at(-1) ?? []);
		this.renderSelectedImage();
	}
	deleteSelectedShape() {
		const item = this.getSelectedImage();
		if (!item || !this.selectedShape) return;
		this.selectedShape.destroy();
		this.selectShape(null);
		this.commitAnnotations(item);
		this.annotationLayer?.draw();
	}
	async submit(event) {
		event.preventDefault();
		if (this.isSubmitting || !this.form.reportValidity()) return;
		const labels = this.config.labels;
		const message = this.message.value.trim();
		if (message === "") {
			this.setError(labels.blankMessage);
			this.message.focus();
			return;
		}
		this.clearMessages();
		this.isSubmitting = true;
		this.submitButton.disabled = true;
		this.submitButton.textContent = labels.submitting;
		const controller = new AbortController();
		this.submitController = controller;
		const generation = this.generation;
		try {
			const availability = await this.reporter.getAvailability(controller.signal);
			if (!availability.available) throw new AvailabilityError(labels.unavailable, 200);
			this.applyLimits(availability.limits);
			const maxFileSize = this.limits.maxFileSizeKb * 1024;
			const maxTotalSize = this.limits.maxTotalSizeKb * 1024;
			const attachments = [];
			let totalSize = 0;
			for (const item of this.images) {
				const blob = await this.exportImage(item);
				if (blob.size > maxFileSize) throw new Error(formatLabel(labels.editedFileTooLarge, this.limits, { filename: item.filename }));
				totalSize += blob.size;
				if (totalSize > maxTotalSize) throw new Error(formatLabel(labels.editedTotalTooLarge, this.limits));
				attachments.push({
					file: blob,
					source: item.source,
					filename: item.filename
				});
			}
			await this.reporter.submit({
				message,
				attachments,
				signal: controller.signal,
				clientReportId: this.clientReportId,
				metadata: {
					source_type: this.config.sourceType,
					route_name: this.config.routeName,
					panel_id: this.config.panelId,
					annotations: this.images.map((item) => ({
						filename: item.filename,
						edited: item.annotations.length > 0,
						count: item.annotations.length
					}))
				}
			});
			if (generation !== this.generation) return;
			this.resetContent();
			this.successMessage.textContent = labels.success;
			this.successMessage.hidden = false;
			this.successCloseTimer = window.setTimeout(() => {
				this.successCloseTimer = null;
				if (this.dialog.open) this.dialog.close();
			}, SUCCESS_CLOSE_DELAY);
		} catch (error) {
			if (generation === this.generation && !controller.signal.aborted) this.setError(this.errorText(error));
		} finally {
			if (this.submitController === controller) this.submitController = null;
			if (generation === this.generation) {
				this.isSubmitting = false;
				this.submitButton.disabled = false;
				this.submitButton.textContent = labels.submit;
			}
		}
	}
	async exportImage(item) {
		if (item.annotations.length === 0) return item.blob;
		const container = document.createElement("div");
		container.style.cssText = "position:fixed;left:-100000px;top:0;opacity:0;pointer-events:none";
		this.root.append(container);
		const built = this.buildStage(item, container, false);
		try {
			const blob = await built.stage.toBlob({
				mimeType: item.blob.type,
				quality: .92,
				pixelRatio: item.naturalWidth / item.stageWidth
			});
			if (!blob) throw new Error(this.config.labels.exportFailed);
			return blob;
		} finally {
			built.stage.destroy();
			container.remove();
		}
	}
	errorText(error) {
		if (!(error instanceof Error)) return this.config.labels.submitFailed;
		const labels = this.config.labels;
		const mapped = {
			ValidationError: labels.validationFailed,
			RateLimitError: labels.rateLimited,
			AvailabilityError: labels.unavailable,
			AttachmentValidationError: labels.attachmentRejected,
			SessionExpiredError: labels.sessionExpired,
			PayloadTooLargeError: labels.payloadTooLarge,
			TimeoutError: labels.timeout,
			ServerError: labels.serverError
		}[error.name];
		if (mapped) return mapped;
		if (error.name === "TransportError") return error.statusCode === void 0 ? labels.networkError : labels.submitFailed;
		return error.message || labels.submitFailed;
	}
	setError(message) {
		this.successMessage.hidden = true;
		this.errorMessage.textContent = message;
		this.errorMessage.hidden = false;
	}
	clearMessages() {
		this.errorMessage.hidden = true;
		this.errorMessage.textContent = "";
		this.successMessage.hidden = true;
		this.successMessage.textContent = "";
	}
	getSelectedImage() {
		return this.images.find((item) => item.id === this.selectedImageId) ?? null;
	}
	totalOriginalSize() {
		return this.images.reduce((total, item) => total + item.blob.size, 0);
	}
	updateControls() {
		const item = this.getSelectedImage();
		this.undoButton.disabled = !item || item.history.length <= 1;
		this.deleteButton.disabled = this.selectedShape === null;
		this.zoomOutButton.disabled = !item || item.zoom <= MIN_ZOOM;
		this.zoomInButton.disabled = !item || item.zoom >= MAX_ZOOM;
		this.zoomLevel.value = `${Math.round((item?.zoom ?? 1) * 100)}%`;
		for (const button of this.toolButtons) button.disabled = item === null;
	}
	destroyStage() {
		this.stage?.destroy();
		this.stage = null;
		this.annotationLayer = null;
		this.transformer = null;
		this.selectedShape = null;
		this.panOrigin = null;
		this.canvasHost.replaceChildren();
		this.canvasHost.style.removeProperty("width");
		this.canvasHost.style.removeProperty("height");
	}
	resetContent() {
		this.destroyStage();
		for (const item of this.images) URL.revokeObjectURL(item.objectUrl);
		this.images = [];
		this.selectedImageId = null;
		this.pendingFiles = 0;
		this.pendingBytes = 0;
		this.clientReportId = createId();
		this.message.value = "";
		this.fileInput.value = "";
		this.renderThumbnails();
		this.emptyState.hidden = false;
		this.canvasHost.hidden = true;
	}
	reset() {
		this.abortSubmit();
		this.generation += 1;
		if (this.isSubmitting) {
			this.isSubmitting = false;
			this.submitButton.textContent = this.config.labels.submit;
		}
		this.setFormDisabled(false);
		if (this.successCloseTimer !== null) {
			window.clearTimeout(this.successCloseTimer);
			this.successCloseTimer = null;
		}
		this.clearMessages();
		this.resetContent();
		this.setTool("move");
	}
	destroy() {
		this.abortSubmit();
		this.generation += 1;
		this.reporter.destroyDiagnostics();
		if (this.successCloseTimer !== null) {
			window.clearTimeout(this.successCloseTimer);
			this.successCloseTimer = null;
		}
		this.resetContent();
		if (this.dialog.open) this.dialog.close();
	}
};
const labels = {
	ja: {
		launcher: "フィードバックを報告",
		eyebrow: "フィードバック",
		title: "フィードバックを報告",
		description: "スクリーンショットや画像と診断情報を安全に送信します。",
		close: "閉じる",
		message: "レポートメッセージ",
		messagePlaceholder: "何が起きたか、期待していた動作を入力してください",
		images: "スクリーンショット・画像（任意）",
		chooseImages: "画像を選択",
		dropHint: "またはドラッグ＆ドロップ",
		fileHint: "{types}・1枚{maxFileSize}MBまで",
		attachments: "添付画像",
		removeAttachment: "添付画像「{filename}」を削除",
		move: "移動",
		pan: "手のひら",
		rectangle: "四角",
		arrow: "矢印",
		undo: "元に戻す",
		deleteSelection: "図形を削除",
		zoomOut: "画像を縮小",
		zoomIn: "画像を拡大",
		toolbar: "画像注釈ツール",
		zoomGroup: "画像の表示倍率",
		empty: "スクリーンショットまたは画像を選択すると、ここで矢印と四角を書き込めます。",
		editorHelp: "図形の移動・リサイズ・削除や元に戻す操作は、下のボタンから行えます。",
		cancel: "キャンセル",
		submit: "レポートを送信",
		submitting: "送信中…",
		unavailable: "現在、この画面からレポートを送信できません。",
		blankMessage: "レポートメッセージを入力してください。",
		fileLimit: "添付できる画像は合計{maxFiles}枚までです。",
		invalidType: "{filename} は対応している画像形式（{types}）ではありません。",
		fileTooLarge: "{filename} は{maxFileSize}MBを超えています。",
		totalTooLarge: "添付画像の合計サイズは{maxTotalSize}MBまでです。",
		editedFileTooLarge: "{filename} の編集後サイズが{maxFileSize}MBを超えています。",
		editedTotalTooLarge: "編集後の添付画像の合計サイズが{maxTotalSize}MBを超えています。",
		exportFailed: "注釈画像を生成できませんでした。",
		submitFailed: "レポートを送信できませんでした。時間をおいて再試行してください。",
		validationFailed: "入力内容または添付画像を確認してください。",
		rateLimited: "送信回数が上限に達しました。しばらく待ってから再試行してください。",
		attachmentRejected: "添付画像の枚数、形式、またはサイズを確認してください。",
		sessionExpired: "セッションの有効期限が切れました。ページを再読み込みしてから再試行してください。",
		payloadTooLarge: "送信データが大きすぎます。画像の枚数やサイズを減らしてください。",
		timeout: "通信がタイムアウトしました。時間をおいて再試行してください。",
		networkError: "ネットワークに接続できませんでした。接続を確認して再試行してください。",
		serverError: "サーバーでエラーが発生しました。時間をおいて再試行してください。",
		success: "送信が完了しました。この画面を閉じます。"
	},
	en: {
		launcher: "Send feedback",
		eyebrow: "Feedback report",
		title: "Send feedback",
		description: "Send screenshots or images with safe diagnostic context.",
		close: "Close",
		message: "Feedback message",
		messagePlaceholder: "Describe what happened and what you expected",
		images: "Screenshots or images (optional)",
		chooseImages: "Choose images",
		dropHint: "or drag and drop",
		fileHint: "{types} · up to {maxFileSize} MB each",
		attachments: "Attached images",
		removeAttachment: "Remove attached image {filename}",
		move: "Move",
		pan: "Hand tool",
		rectangle: "Rectangle",
		arrow: "Arrow",
		undo: "Undo",
		deleteSelection: "Delete shape",
		zoomOut: "Zoom out",
		zoomIn: "Zoom in",
		toolbar: "Image annotation tools",
		zoomGroup: "Image zoom",
		empty: "Choose a screenshot or image to add arrows and rectangles here.",
		editorHelp: "Use the controls below to move, resize, delete, or undo annotation changes.",
		cancel: "Cancel",
		submit: "Send report",
		submitting: "Sending…",
		unavailable: "Feedback reporting is currently unavailable.",
		blankMessage: "Enter a feedback message.",
		fileLimit: "You can attach up to {maxFiles} images.",
		invalidType: "{filename} is not a supported image type ({types}).",
		fileTooLarge: "{filename} exceeds {maxFileSize} MB.",
		totalTooLarge: "Attachments may total up to {maxTotalSize} MB.",
		editedFileTooLarge: "{filename} exceeds {maxFileSize} MB after editing.",
		editedTotalTooLarge: "Edited attachments exceed {maxTotalSize} MB in total.",
		exportFailed: "The annotated image could not be generated.",
		submitFailed: "The report could not be sent. Please try again later.",
		validationFailed: "Check the message and attached images.",
		rateLimited: "Too many reports were sent. Please try again later.",
		attachmentRejected: "Check the number, type, and size of the attached images.",
		sessionExpired: "Your session has expired. Reload the page and try again.",
		payloadTooLarge: "The report is too large. Attach fewer or smaller images.",
		timeout: "The request timed out. Please try again later.",
		networkError: "The network could not be reached. Check your connection and try again.",
		serverError: "The server encountered an error. Please try again later.",
		success: "Your feedback was sent. This dialog will close."
	}
};
/*!
* Toolbar SVG paths are from Lucide Icons.
* Lucide: Copyright (c) 2026 Lucide Icons and Contributors, ISC License.
* Feather-derived move, square, and trash icons: Copyright (c) 2013-present Cole Bemis, MIT License.
* License text: https://github.com/lucide-icons/lucide/blob/main/LICENSE
*/
const toolbarIcons = {
	move: "<svg class=\"toolbar-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 2v20\"/><path d=\"m15 19-3 3-3-3\"/><path d=\"m19 9 3 3-3 3\"/><path d=\"M2 12h20\"/><path d=\"m5 9-3 3 3 3\"/><path d=\"m9 5 3-3 3 3\"/></svg>",
	pan: "<svg class=\"toolbar-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2\"/><path d=\"M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2\"/><path d=\"M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8\"/><path d=\"M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15\"/></svg>",
	rectangle: "<svg class=\"toolbar-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/></svg>",
	arrow: "<svg class=\"toolbar-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M13.207 19.793a.707.707 0 0 1-1.207-.5V16a1 1 0 0 0-1-1H5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h6a1 1 0 0 0 1-1V4.707a.707.707 0 0 1 1.207-.5l6.94 6.94a1.207 1.207 0 0 1 0 1.707z\"/></svg>",
	undo: "<svg class=\"toolbar-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M9 14 4 9l5-5\"/><path d=\"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11\"/></svg>",
	deleteShape: "<svg class=\"toolbar-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M10 11v6\"/><path d=\"M14 11v6\"/><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6\"/><path d=\"M3 6h18\"/><path d=\"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"/></svg>"
};
function widgetTemplate(text) {
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
                            <label class="field"><span>${text.message} <b>*</b></span><textarea data-feedback-message required maxlength="${DEFAULT_LIMITS.maxMessageLength}" rows="6" placeholder="${text.messagePlaceholder}"></textarea></label>
                            <div class="field"><span>${text.images}</span><label data-feedback-dropzone class="dropzone"><span class="plus" aria-hidden="true">＋</span><span><strong>${text.chooseImages}</strong> ${text.dropHint}</span><small data-feedback-file-hint>${formatLabel(text.fileHint, resolveLimits())}</small><input data-feedback-files type="file" accept="${DEFAULT_LIMITS.allowedMimes.join(",")}" multiple></label></div>
                            <div><div class="attachment-heading"><span>${text.attachments}</span><span data-feedback-count>0 / ${DEFAULT_LIMITS.maxFiles}</span></div><div data-feedback-thumbnails class="thumbnails"></div><template data-feedback-thumbnail-template><div data-feedback-thumbnail class="thumbnail"><button type="button" data-feedback-thumbnail-select class="thumbnail-select"><img data-thumbnail-image alt=""><span data-thumbnail-label></span></button><button type="button" data-feedback-remove-image class="thumbnail-remove"></button></div></template></div>
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
                    <footer><div aria-live="polite" class="messages"><p data-feedback-error role="alert" hidden></p><p data-feedback-success role="status" hidden></p></div><div class="footer-actions"><button type="button" data-feedback-cancel>${text.cancel}</button><button type="submit" data-feedback-submit class="primary">${text.submit}</button></div></footer>
                </form>
            </dialog>
        </div>
    `;
}
const HTMLElementBase = typeof HTMLElement === "undefined" ? class {} : HTMLElement;
var FeedbackReporterElement = class extends HTMLElementBase {
	controller = null;
	widgetConfig = {};
	/**
	* Programmatic configuration. Attributes take precedence over these values.
	* Assigning it after the element is connected rebuilds the widget, which discards
	* any draft in progress.
	*/
	set config(config) {
		this.widgetConfig = config ?? {};
		if (this.controller) {
			this.controller.destroy();
			this.controller = null;
			this.connectedCallback();
		}
	}
	get config() {
		return this.widgetConfig;
	}
	connectedCallback() {
		this.upgradeConfigProperty();
		if (this.controller) return;
		const locale = (this.lang || document.documentElement.lang).toLowerCase().startsWith("ja") ? "ja" : "en";
		const root = this.shadowRoot ?? this.attachShadow({ mode: "open" });
		root.innerHTML = widgetTemplate(labels[locale]);
		this.controller = new WidgetController(root, {
			endpoint: this.getAttribute("endpoint") ?? this.widgetConfig.endpoint,
			availabilityEndpoint: this.getAttribute("availability-endpoint") ?? this.widgetConfig.availabilityEndpoint,
			sourceType: this.getAttribute("source-type") ?? this.widgetConfig.sourceType ?? "web_site",
			routeName: this.getAttribute("route-name") || this.widgetConfig.routeName || null,
			panelId: this.getAttribute("panel-id") || this.widgetConfig.panelId || null,
			reporter: this.widgetConfig.reporter,
			labels: labels[locale]
		});
	}
	/**
	* A `config` value assigned before the element was upgraded is stored as an own
	* property that shadows the accessor. Move it through the setter instead.
	*/
	upgradeConfigProperty() {
		if (!Object.hasOwn(this, "config")) return;
		const value = this.config;
		delete this.config;
		this.widgetConfig = value ?? {};
	}
	disconnectedCallback() {
		this.controller?.destroy();
		this.controller = null;
	}
	async open() {
		await this.controller?.open();
	}
	close() {
		this.controller?.close();
	}
};
const registeredElementConstructors = /* @__PURE__ */ new Map();
function registerFeedbackReporterElement(tagName = "trust-feedback-reporter") {
	if (typeof customElements === "undefined") return;
	const current = customElements.get(tagName);
	const registered = registeredElementConstructors.get(tagName);
	if (current && current !== registered) throw new Error(`Custom element "${tagName}" is already registered.`);
	if (current) return;
	const elementConstructor = tagName === "trust-feedback-reporter" ? FeedbackReporterElement : class extends FeedbackReporterElement {};
	customElements.define(tagName, elementConstructor);
	registeredElementConstructors.set(tagName, elementConstructor);
}

//#endregion
export { FeedbackReporterElement, registerFeedbackReporterElement };
//# sourceMappingURL=widget.js.map