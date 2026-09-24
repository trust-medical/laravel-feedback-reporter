// resources/js/errors.ts
var FeedbackReporterError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "FeedbackReporterError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var AvailabilityError = class extends FeedbackReporterError {
  constructor(message = "Feedback reporter is currently unavailable.", statusCode = 404) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AvailabilityError";
  }
  statusCode;
};
var AttachmentValidationError = class extends FeedbackReporterError {
  constructor(message) {
    super(message);
    this.name = "AttachmentValidationError";
  }
};
var TransportError = class extends FeedbackReporterError {
  constructor(message, statusCode, responseBody) {
    super(message);
    this.statusCode = statusCode;
    this.responseBody = responseBody;
    this.name = "TransportError";
  }
  statusCode;
  responseBody;
};
var ValidationError = class extends TransportError {
  constructor(message, errors = {}, statusCode = 422) {
    super(message, statusCode, { errors });
    this.errors = errors;
    this.name = "ValidationError";
  }
  errors;
};
var RateLimitError = class extends TransportError {
  constructor(message = "Too many requests. Please try again later.", statusCode = 429) {
    super(message, statusCode);
    this.name = "RateLimitError";
  }
};
var ServerError = class extends TransportError {
  constructor(message = "Internal server error occurred.", statusCode = 500) {
    super(message, statusCode);
    this.name = "ServerError";
  }
};

// resources/js/attachments.ts
function prepareAttachments(rawAttachments, maxFiles = 5, maxFileSize = 5 * 1024 * 1024) {
  if (!rawAttachments || rawAttachments.length === 0) {
    return [];
  }
  if (rawAttachments.length > maxFiles) {
    throw new AttachmentValidationError(
      `Cannot attach more than ${maxFiles} files. Provided: ${rawAttachments.length}`
    );
  }
  return rawAttachments.map((item, index) => {
    const file = item.file;
    if (!(file instanceof Blob)) {
      throw new AttachmentValidationError(
        `Attachment at index ${index} is not a valid File or Blob.`
      );
    }
    if (file.size > maxFileSize) {
      throw new AttachmentValidationError(
        `Attachment "${item.filename || "file"}" exceeds maximum allowed size (${Math.round(maxFileSize / 1024 / 1024)}MB).`
      );
    }
    let filename = item.filename;
    if (!filename) {
      if (file instanceof File && file.name) {
        filename = file.name;
      } else {
        const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/webp" ? "webp" : "png";
        filename = `attachment-${Date.now()}-${index}.${ext}`;
      }
    }
    return {
      file,
      source: item.source,
      filename
    };
  });
}

// resources/js/sanitizer.ts
function sanitizeUrl(rawUrl, options) {
  try {
    const parsed = new URL(rawUrl, window.location.origin);
    let sanitized = `${parsed.origin}${parsed.pathname}`;
    if (options?.query?.mode === "allowlist" && options.query.keys?.length) {
      const allowedKeys = new Set(options.query.keys);
      const newParams = new URLSearchParams();
      for (const [key, val] of parsed.searchParams.entries()) {
        if (allowedKeys.has(key)) {
          newParams.append(key, val);
        }
      }
      const qs = newParams.toString();
      if (qs) {
        sanitized += `?${qs}`;
      }
    }
    if (options?.hash && parsed.hash) {
      sanitized += parsed.hash;
    }
    return sanitized;
  } catch {
    return rawUrl.split("?")[0]?.split("#")[0] || "";
  }
}
function truncateString(val, maxLength = 1e3) {
  if (val.length <= maxLength) {
    return val;
  }
  return `${val.slice(0, maxLength)}...[TRUNCATED]`;
}

// resources/js/diagnostics/breadcrumbs.ts
var BreadcrumbsCollector = class {
  buffer = [];
  maxEntries = 50;
  installed = false;
  subscribers = 0;
  clickHandler = null;
  submitHandler = null;
  popstateHandler = null;
  init(maxEntries = 50) {
    if (typeof window === "undefined") {
      return;
    }
    if (this.installed) {
      this.subscribers += 1;
      return;
    }
    this.maxEntries = maxEntries;
    this.installed = true;
    this.subscribers = 1;
    this.clickHandler = (e) => {
      const target = e.target;
      if (!target?.tagName) {
        return;
      }
      if (target instanceof HTMLInputElement && (target.type === "password" || target.getAttribute("autocomplete")?.includes("password"))) {
        return;
      }
      const tag = target.tagName.toLowerCase();
      const id = target.id || void 0;
      const classes = target.className && typeof target.className === "string" ? target.className.split(/\s+/).filter(Boolean).slice(0, 5) : void 0;
      this.add({
        category: "click",
        message: `Click on <${tag}${id ? `#${id}` : ""}>`,
        data: { tag, id, classes },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    };
    document.addEventListener("click", this.clickHandler, true);
    this.submitHandler = (e) => {
      const target = e.target;
      if (!target?.tagName) {
        return;
      }
      const id = target.id || void 0;
      const action = target.action ? sanitizeUrl(target.action) : void 0;
      this.add({
        category: "submit",
        message: `Submit form${id ? ` #${id}` : ""}`,
        data: { id, action },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    };
    document.addEventListener("submit", this.submitHandler, true);
    this.popstateHandler = () => {
      this.add({
        category: "navigation",
        message: `Navigated to ${sanitizeUrl(window.location.href)}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    };
    window.addEventListener("popstate", this.popstateHandler);
  }
  add(item) {
    this.buffer.push(item);
    if (this.buffer.length > this.maxEntries) {
      this.buffer.shift();
    }
  }
  get() {
    return [...this.buffer];
  }
  clear() {
    this.buffer = [];
  }
  destroy() {
    if (!this.installed || typeof window === "undefined") {
      return;
    }
    if (this.subscribers > 1) {
      this.subscribers -= 1;
      return;
    }
    if (this.clickHandler) {
      document.removeEventListener("click", this.clickHandler, true);
    }
    if (this.submitHandler) {
      document.removeEventListener("submit", this.submitHandler, true);
    }
    if (this.popstateHandler) {
      window.removeEventListener("popstate", this.popstateHandler);
    }
    this.buffer = [];
    this.installed = false;
    this.subscribers = 0;
    this.clickHandler = null;
    this.submitHandler = null;
    this.popstateHandler = null;
  }
};
var breadcrumbsCollector = new BreadcrumbsCollector();

// resources/js/diagnostics/console.ts
var ConsoleCollector = class {
  buffer = [];
  maxEntries = 20;
  installed = false;
  subscribers = 0;
  wrappedError = null;
  wrappedWarn = null;
  originalError = null;
  originalWarn = null;
  init(maxEntries = 20) {
    if (typeof console === "undefined") {
      return;
    }
    if (this.installed) {
      this.subscribers += 1;
      return;
    }
    this.maxEntries = maxEntries;
    this.installed = true;
    this.subscribers = 1;
    this.originalError = console.error;
    this.originalWarn = console.warn;
    this.wrappedError = (...args) => {
      this.add("error", args);
      this.originalError?.apply(console, args);
    };
    console.error = this.wrappedError;
    this.wrappedWarn = (...args) => {
      this.add("warn", args);
      this.originalWarn?.apply(console, args);
    };
    console.warn = this.wrappedWarn;
  }
  add(level, args) {
    const messages = args.map((arg) => {
      if (typeof arg === "string") {
        return truncateString(arg, 500);
      }
      if (arg instanceof Error) {
        return truncateString(`${arg.name}: ${arg.message}`, 500);
      }
      try {
        return truncateString(JSON.stringify(arg), 500);
      } catch {
        return String(arg);
      }
    });
    this.buffer.push({
      level,
      messages,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (this.buffer.length > this.maxEntries) {
      this.buffer.shift();
    }
  }
  get() {
    return [...this.buffer];
  }
  clear() {
    this.buffer = [];
  }
  destroy() {
    if (!this.installed || typeof console === "undefined") {
      return;
    }
    if (this.subscribers > 1) {
      this.subscribers -= 1;
      return;
    }
    if (this.originalError && console.error === this.wrappedError) {
      console.error = this.originalError;
    }
    if (this.originalWarn && console.warn === this.wrappedWarn) {
      console.warn = this.originalWarn;
    }
    this.buffer = [];
    this.installed = false;
    this.subscribers = 0;
    this.originalError = null;
    this.originalWarn = null;
    this.wrappedError = null;
    this.wrappedWarn = null;
  }
};
var consoleCollector = new ConsoleCollector();

// resources/js/diagnostics/errors.ts
var ErrorCollector = class {
  buffer = [];
  maxEntries = 20;
  installed = false;
  subscribers = 0;
  errorHandler = null;
  rejectionHandler = null;
  init(maxEntries = 20) {
    if (typeof window === "undefined") {
      return;
    }
    if (this.installed) {
      this.subscribers += 1;
      return;
    }
    this.maxEntries = maxEntries;
    this.installed = true;
    this.subscribers = 1;
    this.errorHandler = (event) => {
      this.add({
        type: "error",
        message: truncateString(event.message, 500),
        source: event.filename ? truncateString(event.filename, 255) : void 0,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack ? truncateString(event.error.stack, 2e3) : void 0,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    };
    window.addEventListener("error", this.errorHandler);
    this.rejectionHandler = (event) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error && reason.stack ? truncateString(reason.stack, 2e3) : void 0;
      this.add({
        type: "unhandledrejection",
        message: truncateString(message, 500),
        stack,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    };
    window.addEventListener("unhandledrejection", this.rejectionHandler);
  }
  add(item) {
    this.buffer.push(item);
    if (this.buffer.length > this.maxEntries) {
      this.buffer.shift();
    }
  }
  get() {
    return [...this.buffer];
  }
  clear() {
    this.buffer = [];
  }
  destroy() {
    if (!this.installed || typeof window === "undefined") {
      return;
    }
    if (this.subscribers > 1) {
      this.subscribers -= 1;
      return;
    }
    if (this.errorHandler) {
      window.removeEventListener("error", this.errorHandler);
    }
    if (this.rejectionHandler) {
      window.removeEventListener("unhandledrejection", this.rejectionHandler);
    }
    this.buffer = [];
    this.installed = false;
    this.subscribers = 0;
    this.errorHandler = null;
    this.rejectionHandler = null;
  }
};
var errorCollector = new ErrorCollector();

// resources/js/diagnostics/network.ts
var NetworkErrorCollector = class {
  buffer = [];
  maxEntries = 20;
  installed = false;
  subscribers = 0;
  wrappedFetch = null;
  wrappedXhrOpen = null;
  wrappedXhrSend = null;
  originalFetch = null;
  originalXhrOpen = null;
  originalXhrSend = null;
  init(maxEntries = 20) {
    if (typeof window === "undefined") {
      return;
    }
    if (this.installed) {
      this.subscribers += 1;
      return;
    }
    this.maxEntries = maxEntries;
    this.installed = true;
    this.subscribers = 1;
    if (typeof window.fetch === "function") {
      const originalFetch = window.fetch;
      this.originalFetch = originalFetch;
      const self = this;
      window.fetch = async function(input, init) {
        const start = performance.now();
        const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
        const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const sanitized = sanitizeUrl(rawUrl);
        try {
          const response = await originalFetch.apply(this, [input, init]);
          if (!response.ok) {
            self.add({
              method,
              url: sanitized,
              status: response.status,
              duration_ms: Math.round(performance.now() - start),
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
          return response;
        } catch (err) {
          self.add({
            method,
            url: sanitized,
            status: "NETWORK_ERROR",
            duration_ms: Math.round(performance.now() - start),
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
          throw err;
        }
      };
      this.wrappedFetch = window.fetch;
    }
    if (typeof XMLHttpRequest !== "undefined") {
      const originalXhrOpen = XMLHttpRequest.prototype.open;
      const originalXhrSend = XMLHttpRequest.prototype.send;
      this.originalXhrOpen = originalXhrOpen;
      this.originalXhrSend = originalXhrSend;
      const self = this;
      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this._fbrMethod = method.toUpperCase();
        this._fbrUrl = sanitizeUrl(String(url));
        return originalXhrOpen.apply(this, [method, url, ...rest]);
      };
      XMLHttpRequest.prototype.send = function(...args) {
        const xhr = this;
        xhr._fbrStart = performance.now();
        this.addEventListener("loadend", () => {
          if (this.status >= 400 || this.status === 0) {
            self.add({
              method: xhr._fbrMethod || "GET",
              url: xhr._fbrUrl || "",
              status: this.status === 0 ? "NETWORK_ERROR" : this.status,
              duration_ms: xhr._fbrStart ? Math.round(performance.now() - xhr._fbrStart) : void 0,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
        });
        return originalXhrSend.apply(this, args);
      };
      this.wrappedXhrOpen = XMLHttpRequest.prototype.open;
      this.wrappedXhrSend = XMLHttpRequest.prototype.send;
    }
  }
  add(item) {
    this.buffer.push(item);
    if (this.buffer.length > this.maxEntries) {
      this.buffer.shift();
    }
  }
  get() {
    return [...this.buffer];
  }
  clear() {
    this.buffer = [];
  }
  destroy() {
    if (!this.installed || typeof window === "undefined") {
      return;
    }
    if (this.subscribers > 1) {
      this.subscribers -= 1;
      return;
    }
    if (this.originalFetch && window.fetch === this.wrappedFetch) {
      window.fetch = this.originalFetch;
    }
    if (this.originalXhrOpen && XMLHttpRequest.prototype.open === this.wrappedXhrOpen) {
      XMLHttpRequest.prototype.open = this.originalXhrOpen;
    }
    if (this.originalXhrSend && XMLHttpRequest.prototype.send === this.wrappedXhrSend) {
      XMLHttpRequest.prototype.send = this.originalXhrSend;
    }
    this.buffer = [];
    this.installed = false;
    this.subscribers = 0;
    this.originalFetch = null;
    this.originalXhrOpen = null;
    this.originalXhrSend = null;
    this.wrappedFetch = null;
    this.wrappedXhrOpen = null;
    this.wrappedXhrSend = null;
  }
};
var networkErrorCollector = new NetworkErrorCollector();

// resources/js/diagnostics/performance.ts
function getNormalizedPerformance() {
  if (typeof window === "undefined" || typeof performance === "undefined") {
    return null;
  }
  try {
    const navEntries = performance.getEntriesByType("navigation");
    if (navEntries && navEntries.length > 0) {
      const entry = navEntries[0];
      return {
        navigation_type: entry.type,
        dom_interactive: Math.round(entry.domInteractive),
        dom_content_loaded: Math.round(entry.domContentLoadedEventEnd),
        load_event_end: Math.round(entry.loadEventEnd),
        response_start: Math.round(entry.responseStart),
        response_end: Math.round(entry.responseEnd),
        duration: Math.round(entry.duration),
        transfer_size: entry.transferSize,
        encoded_body_size: entry.encodedBodySize,
        decoded_body_size: entry.decodedBodySize
      };
    }
    const timing = performance.timing;
    if (timing) {
      const navStart = timing.navigationStart;
      return {
        dom_interactive: Math.max(0, timing.domInteractive - navStart),
        dom_content_loaded: Math.max(0, timing.domContentLoadedEventEnd - navStart),
        load_event_end: Math.max(0, timing.loadEventEnd - navStart),
        response_start: Math.max(0, timing.responseStart - navStart),
        response_end: Math.max(0, timing.responseEnd - navStart)
      };
    }
    return null;
  } catch {
    return null;
  }
}

// resources/js/context.ts
async function collectDiagnosticContext(config) {
  const context = {};
  if (typeof window === "undefined") {
    return context;
  }
  context.page = {
    url: sanitizeUrl(window.location.href, config?.url),
    origin: window.location.origin,
    pathname: window.location.pathname,
    title: document.title || "",
    referrer: document.referrer ? sanitizeUrl(document.referrer, config?.url) : ""
  };
  context.viewport = {
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    document_width: document.documentElement.scrollWidth,
    document_height: document.documentElement.scrollHeight,
    scroll_x: window.scrollX,
    scroll_y: window.scrollY,
    device_pixel_ratio: window.devicePixelRatio || 1
  };
  if (window.screen) {
    context.screen = {
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      screen_avail_width: window.screen.availWidth,
      screen_avail_height: window.screen.availHeight,
      screen_color_depth: window.screen.colorDepth,
      screen_pixel_depth: window.screen.pixelDepth
    };
  }
  const nav = window.navigator;
  context.browser = {
    user_agent: nav.userAgent,
    language: nav.language,
    languages: nav.languages ? [...nav.languages] : [nav.language],
    platform: nav.platform,
    vendor: nav.vendor,
    cookie_enabled: nav.cookieEnabled,
    online: nav.onLine,
    do_not_track: nav.doNotTrack,
    hardware_concurrency: nav.hardwareConcurrency,
    device_memory: nav.deviceMemory,
    user_agent_data: nav.userAgentData ? {
      brands: nav.userAgentData.brands,
      mobile: nav.userAgentData.mobile,
      platform: nav.userAgentData.platform
    } : void 0
  };
  if (nav.connection) {
    context.network = {
      effective_type: nav.connection.effectiveType,
      downlink: nav.connection.downlink,
      rtt: nav.connection.rtt,
      save_data: nav.connection.saveData,
      connection_type: nav.connection.type
    };
  }
  const activeEl = document.activeElement;
  if (activeEl && activeEl !== document.body) {
    context.active_element = {
      tag: activeEl.tagName.toLowerCase(),
      id: activeEl.id || void 0,
      classes: activeEl.className && typeof activeEl.className === "string" ? activeEl.className.split(/\s+/).filter(Boolean).slice(0, 5) : void 0
    };
  }
  if (config?.storage) {
    const storageData = {};
    if (config.storage.localStorageKeys?.length && typeof localStorage !== "undefined") {
      const ls = {};
      for (const key of config.storage.localStorageKeys) {
        ls[key] = localStorage.getItem(key);
      }
      storageData.local_storage = ls;
    }
    if (config.storage.sessionStorageKeys?.length && typeof sessionStorage !== "undefined") {
      const ss = {};
      for (const key of config.storage.sessionStorageKeys) {
        ss[key] = sessionStorage.getItem(key);
      }
      storageData.session_storage = ss;
    }
    if (Object.keys(storageData).length > 0) {
      context.storage = storageData;
    }
  }
  if (config?.diagnostics?.performance !== false) {
    const perf = getNormalizedPerformance();
    if (perf) {
      context.performance = perf;
    }
  }
  const errors = errorCollector.get();
  if (errors.length > 0) {
    context.errors = errors;
  }
  const consoleEntries = consoleCollector.get();
  if (consoleEntries.length > 0) {
    context.console = consoleEntries;
  }
  const networkErrors = networkErrorCollector.get();
  if (networkErrors.length > 0) {
    context.network_errors = networkErrors;
  }
  const breadcrumbs = breadcrumbsCollector.get();
  if (breadcrumbs.length > 0) {
    context.breadcrumbs = breadcrumbs;
  }
  if (config?.metadata) {
    const appMeta = typeof config.metadata === "function" ? await config.metadata() : config.metadata;
    if (appMeta && typeof appMeta === "object") {
      context.application = appMeta;
    }
  }
  return context;
}

// resources/js/transport.ts
function getCsrfToken(config) {
  if (config?.csrfToken) {
    return typeof config.csrfToken === "function" ? config.csrfToken() : config.csrfToken;
  }
  if (typeof document !== "undefined") {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      return metaTag.getAttribute("content");
    }
  }
  return null;
}
async function checkAvailability(config, signal) {
  const url = config?.availabilityEndpoint || "/feedback-reporter/availability";
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal
    });
    if (!res.ok) {
      return false;
    }
    const data = await res.json();
    return Boolean(data.available);
  } catch (err) {
    if (signal?.aborted) {
      throw err;
    }
    return false;
  }
}
async function sendFeedbackReport(formData, config, signal) {
  const url = config?.endpoint || "/feedback-reporter/reports";
  const headers = {
    Accept: "application/json"
  };
  const csrf = getCsrfToken(config);
  if (csrf) {
    headers["X-CSRF-TOKEN"] = csrf;
  }
  if (config?.headers) {
    const customHeaders = typeof config.headers === "function" ? await config.headers() : config.headers;
    Object.assign(headers, customHeaders);
  }
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
      signal
    });
  } catch (err) {
    if (signal?.aborted) {
      throw err;
    }
    throw new TransportError(
      `Network request failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  if (res.status === 201) {
    return await res.json();
  }
  let responseBody = null;
  try {
    responseBody = await res.json();
  } catch {
  }
  if (res.status === 422) {
    const errorData = responseBody;
    throw new ValidationError(
      errorData?.message || "Validation failed for feedback submission.",
      errorData?.errors || {},
      res.status
    );
  }
  if (res.status === 429) {
    throw new RateLimitError(
      "Too many feedback submissions. Please wait before retrying.",
      res.status
    );
  }
  if (res.status === 403 || res.status === 404) {
    throw new AvailabilityError("Feedback reporter is currently unavailable.", res.status);
  }
  if (res.status >= 500) {
    throw new ServerError("Server encountered an error while processing feedback.", res.status);
  }
  throw new TransportError(
    `Unexpected response status code: ${res.status}`,
    res.status,
    responseBody
  );
}

// resources/js/reporter.ts
var FeedbackReporter = class {
  constructor(config = {}) {
    this.config = config;
    if (this.config.diagnostics) {
      this.initDiagnostics();
    }
  }
  config;
  activeDiagnostics = /* @__PURE__ */ new Set();
  initDiagnostics() {
    const diag = this.config.diagnostics;
    if (!diag) {
      return;
    }
    if (diag.errors && !this.activeDiagnostics.has("errors")) {
      const max = typeof diag.errors === "object" ? diag.errors.maxEntries : 20;
      errorCollector.init(max);
      this.activeDiagnostics.add("errors");
    }
    if (diag.console && !this.activeDiagnostics.has("console")) {
      const max = typeof diag.console === "object" ? diag.console.maxEntries : 20;
      consoleCollector.init(max);
      this.activeDiagnostics.add("console");
    }
    if (diag.network && !this.activeDiagnostics.has("network")) {
      const max = typeof diag.network === "object" ? diag.network.maxEntries : 20;
      networkErrorCollector.init(max);
      this.activeDiagnostics.add("network");
    }
    if (diag.breadcrumbs && !this.activeDiagnostics.has("breadcrumbs")) {
      const max = typeof diag.breadcrumbs === "object" ? diag.breadcrumbs.maxEntries : 50;
      breadcrumbsCollector.init(max);
      this.activeDiagnostics.add("breadcrumbs");
    }
  }
  destroyDiagnostics() {
    if (this.activeDiagnostics.delete("errors")) errorCollector.destroy();
    if (this.activeDiagnostics.delete("console")) consoleCollector.destroy();
    if (this.activeDiagnostics.delete("network")) networkErrorCollector.destroy();
    if (this.activeDiagnostics.delete("breadcrumbs")) breadcrumbsCollector.destroy();
  }
  async isAvailable(signal) {
    return checkAvailability(this.config, signal);
  }
  async collectContext() {
    const ctx = await collectDiagnosticContext(this.config);
    this.config.callbacks?.onContextCollected?.(ctx);
    return ctx;
  }
  async submit(options) {
    const signal = options.signal;
    const attachments = options.attachments || [];
    const preparedAttachments = prepareAttachments(attachments);
    const formData = new FormData();
    const clientReportId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    formData.append("client_report_id", clientReportId);
    formData.append("message", options.message);
    preparedAttachments.forEach((att, index) => {
      formData.append(`attachments[${index}][file]`, att.file, att.filename);
      formData.append(`attachments[${index}][source]`, att.source);
    });
    const context = await this.collectContext();
    let customMeta;
    if (options.metadata) {
      customMeta = typeof options.metadata === "function" ? await options.metadata() : options.metadata;
    }
    const finalMetadata = {
      ...context,
      ...customMeta ? { report_metadata: customMeta } : {}
    };
    formData.append("metadata", JSON.stringify(finalMetadata));
    if (context.page) {
      if (context.page.url) formData.append("page_url", String(context.page.url));
      if (context.page.title) formData.append("page_title", String(context.page.title));
    }
    if (context.viewport) {
      if (context.viewport.viewport_width !== void 0)
        formData.append("viewport_width", String(context.viewport.viewport_width));
      if (context.viewport.viewport_height !== void 0)
        formData.append("viewport_height", String(context.viewport.viewport_height));
    }
    if (context.screen) {
      if (context.screen.screen_width !== void 0)
        formData.append("screen_width", String(context.screen.screen_width));
      if (context.screen.screen_height !== void 0)
        formData.append("screen_height", String(context.screen.screen_height));
    }
    if (context.browser) {
      if (context.browser.language) formData.append("locale", String(context.browser.language));
    }
    try {
      formData.append("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
    }
    this.config.callbacks?.onSubmitStart?.();
    try {
      const response = await sendFeedbackReport(formData, this.config, signal);
      this.config.callbacks?.onSubmitSuccess?.(response);
      return response;
    } catch (err) {
      this.config.callbacks?.onSubmitError?.(err);
      throw err;
    }
  }
  async report(options) {
    const signal = options.signal;
    const available = await this.isAvailable(signal);
    if (!available) {
      throw new AvailabilityError("Feedback reporter is currently unavailable.");
    }
    return this.submit(options);
  }
};
function createFeedbackReporter(config) {
  return new FeedbackReporter(config);
}

export { AttachmentValidationError, AvailabilityError, FeedbackReporter, FeedbackReporterError, RateLimitError, ServerError, TransportError, ValidationError, breadcrumbsCollector, checkAvailability, collectDiagnosticContext, consoleCollector, createFeedbackReporter, errorCollector, getCsrfToken, getNormalizedPerformance, networkErrorCollector, prepareAttachments, sanitizeUrl, sendFeedbackReport, truncateString };
//# sourceMappingURL=chunk-C65TNJGS.js.map
//# sourceMappingURL=chunk-C65TNJGS.js.map