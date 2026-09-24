export const widgetStyles = `
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
    dialog { width: min(72rem, calc(100vw - 2rem)); max-width: none; max-height: calc(100dvh - 2rem); margin: auto; padding: 0; overflow: hidden; border: 1px solid var(--fbr-border); border-radius: 1rem; background: var(--fbr-bg); color: var(--fbr-text); box-shadow: 0 25px 60px rgb(0 0 0 / 35%); }
    dialog::backdrop { background: var(--fbr-overlay); }
    form { display: flex; max-height: calc(100dvh - 2rem); flex-direction: column; }
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
    .dropzone input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    .plus { font-size: 1.5rem; }
    .dropzone small { font-size: .75rem; font-weight: 400; }
    .attachment-heading { display: flex; align-items: center; justify-content: space-between; gap: .75rem; font-size: .875rem; font-weight: 600; }
    [data-feedback-count] { color: var(--fbr-muted); font-size: .75rem; font-weight: 400; }
    .thumbnails { display: grid; grid-template-columns: repeat(3, 1fr); gap: .5rem; margin-top: .75rem; }
    .thumbnail { position: relative; overflow: hidden; padding: 0; border: 0; border-radius: .5rem; background: var(--fbr-panel); cursor: pointer; }
    .thumbnail[data-selected="true"] { outline: 2px solid var(--fbr-accent); }
    .thumbnail img { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; }
    .thumbnail span { position: absolute; inset: auto 0 0; overflow: hidden; padding: .25rem .375rem; background: rgb(15 23 42 / 75%); color: #fff; font-size: .625rem; text-align: left; text-overflow: ellipsis; white-space: nowrap; }
    .editor { display: flex; min-height: 32rem; min-width: 0; flex-direction: column; gap: 1rem; overflow: hidden; padding: 1.5rem; }
    .toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
    .toolbar button, .footer-actions button { border: 1px solid var(--fbr-border); border-radius: .5rem; background: transparent; padding: .5rem .75rem; font-size: .875rem; font-weight: 600; cursor: pointer; }
    .toolbar button[aria-pressed="true"], .primary { border-color: var(--fbr-accent) !important; background: var(--fbr-accent) !important; color: #fff !important; }
    button:disabled { cursor: not-allowed; opacity: .4; }
    .separator { width: 1px; height: 1.5rem; margin: 0 .25rem; background: var(--fbr-border); }
    .zoom { display: inline-flex; overflow: hidden; border: 1px solid var(--fbr-border); border-radius: .5rem; }
    .zoom button { border: 0; border-radius: 0; }
    .zoom output { min-width: 3.5rem; padding: .5rem; border-inline: 1px solid var(--fbr-border); color: var(--fbr-text); font-size: .75rem; font-weight: 700; text-align: center; }
    .viewport { position: relative; min-height: 20rem; flex: 1; overflow: auto; border-radius: .75rem; background: var(--fbr-panel); padding: .75rem; scrollbar-gutter: stable; }
    .viewport-inner { display: grid; min-width: 100%; min-height: 100%; place-items: center; }
    [data-feedback-empty] { max-width: 24rem; color: var(--fbr-muted); font-size: .875rem; line-height: 1.5rem; text-align: center; }
    .canvas-host { overflow: hidden; border-radius: .5rem; background: #fff; box-shadow: 0 12px 30px rgb(0 0 0 / 18%); }
    .help { margin: 0; font-size: .75rem; }
    .messages { min-height: 1.25rem; font-size: .875rem; }
    [data-feedback-error] { color: #dc2626; }
    [data-feedback-success] { color: #059669; }
    .footer-actions { display: flex; justify-content: flex-end; gap: .75rem; }
    .primary { padding-inline: 1.25rem !important; box-shadow: 0 8px 20px rgb(225 29 72 / 20%); }
    @media (max-width: 900px) {
        dialog { width: calc(100vw - 1rem); max-height: calc(100dvh - 1rem); }
        form { max-height: calc(100dvh - 1rem); }
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
`
