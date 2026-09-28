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
var SessionExpiredError = class extends TransportError {
  constructor(message = "The session or CSRF token has expired. Reload the page and try again.", statusCode = 419) {
    super(message, statusCode);
    this.name = "SessionExpiredError";
  }
};
var PayloadTooLargeError = class extends TransportError {
  constructor(message = "The request payload is too large for the server.", statusCode = 413) {
    super(message, statusCode);
    this.name = "PayloadTooLargeError";
  }
};
var TimeoutError = class extends TransportError {
  constructor(timeoutMs) {
    super(`The request timed out after ${timeoutMs} ms.`);
    this.timeoutMs = timeoutMs;
    this.name = "TimeoutError";
  }
  timeoutMs;
};

// resources/js/limits.ts
var DEFAULT_LIMITS = Object.freeze({
  maxFiles: 5,
  maxFileSizeKb: 5120,
  maxTotalSizeKb: 20480,
  allowedMimes: ["image/png", "image/jpeg", "image/webp"],
  maxMessageLength: 1e4,
  maxMetadataBytes: 262144,
  maxMetadataDepth: 10
});
function positiveInteger(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}
function normalizeLimits(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const allowedMimes = Array.isArray(source.allowed_mimes) ? source.allowed_mimes.filter((mime) => typeof mime === "string") : [...DEFAULT_LIMITS.allowedMimes];
  return {
    maxFiles: positiveInteger(source.max_files, DEFAULT_LIMITS.maxFiles),
    maxFileSizeKb: positiveInteger(source.max_file_size_kb, DEFAULT_LIMITS.maxFileSizeKb),
    maxTotalSizeKb: positiveInteger(source.max_total_size_kb, DEFAULT_LIMITS.maxTotalSizeKb),
    allowedMimes,
    maxMessageLength: positiveInteger(source.max_message_length, DEFAULT_LIMITS.maxMessageLength),
    maxMetadataBytes: positiveInteger(source.max_metadata_bytes, DEFAULT_LIMITS.maxMetadataBytes),
    maxMetadataDepth: positiveInteger(source.max_metadata_depth, DEFAULT_LIMITS.maxMetadataDepth)
  };
}
function resolveLimits(limits) {
  const resolved = {
    ...DEFAULT_LIMITS,
    allowedMimes: [...DEFAULT_LIMITS.allowedMimes]
  };
  if (!limits) {
    return resolved;
  }
  for (const key of Object.keys(limits)) {
    const value = limits[key];
    if (value !== void 0) {
      Object.assign(resolved, { [key]: value });
    }
  }
  return resolved;
}

// resources/js/attachments.ts
function formatMegabytes(bytes) {
  const megabytes = bytes / 1024 / 1024;
  return Number.isInteger(megabytes) ? String(megabytes) : megabytes.toFixed(1);
}
function prepareAttachments(rawAttachments, limitsOrMaxFiles, legacyMaxFileSize) {
  if (!rawAttachments || rawAttachments.length === 0) {
    return [];
  }
  const limits = typeof limitsOrMaxFiles === "number" ? {
    maxFiles: limitsOrMaxFiles,
    ...legacyMaxFileSize !== void 0 ? { maxFileSizeKb: legacyMaxFileSize / 1024 } : {}
  } : limitsOrMaxFiles ?? {};
  const maxFiles = limits.maxFiles ?? DEFAULT_LIMITS.maxFiles;
  const maxFileSize = (limits.maxFileSizeKb ?? DEFAULT_LIMITS.maxFileSizeKb) * 1024;
  const maxTotalSize = (limits.maxTotalSizeKb ?? DEFAULT_LIMITS.maxTotalSizeKb) * 1024;
  const allowedMimes = limits.allowedMimes ?? DEFAULT_LIMITS.allowedMimes;
  if (rawAttachments.length > maxFiles) {
    throw new AttachmentValidationError(
      `Cannot attach more than ${maxFiles} files. Provided: ${rawAttachments.length}`
    );
  }
  let totalSize = 0;
  const prepared = rawAttachments.map((item, index) => {
    const file = item.file;
    if (!(file instanceof Blob)) {
      throw new AttachmentValidationError(
        `Attachment at index ${index} is not a valid File or Blob.`
      );
    }
    const label = item.filename || file instanceof File && file.name || "file";
    if (file.type && !allowedMimes.includes(file.type)) {
      throw new AttachmentValidationError(
        `Attachment "${label}" has an unsupported type (${file.type}).`
      );
    }
    if (file.size > maxFileSize) {
      throw new AttachmentValidationError(
        `Attachment "${label}" exceeds maximum allowed size (${formatMegabytes(maxFileSize)}MB).`
      );
    }
    totalSize += file.size;
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
  if (totalSize > maxTotalSize) {
    throw new AttachmentValidationError(
      `Attachments exceed the maximum total size (${formatMegabytes(maxTotalSize)}MB).`
    );
  }
  return prepared;
}

// resources/js/sanitizer.ts
function sanitizeUrl(rawUrl, options) {
  try {
    const parsed = new URL(rawUrl, window.location.origin);
    let sanitized = `${parsed.origin}${parsed.pathname}`;
    const query = options?.query;
    if (query?.mode === "allowlist" || query?.mode === "exclude") {
      const keys = new Set(query.keys ?? []);
      const newParams = new URLSearchParams();
      for (const [key, val] of parsed.searchParams.entries()) {
        const listed = keys.has(key);
        if (query.mode === "allowlist" ? listed : !listed) {
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
function sanitizeUrlsInText(text, options) {
  return text.replace(/\b(?:https?|wss?):\/\/[^\s()<>"'`]+/g, (match) => {
    const location = match.match(/(?::\d+){1,2}$/)?.[0] ?? "";
    const url = location ? match.slice(0, -location.length) : match;
    return `${sanitizeUrl(url, options)}${location}`;
  });
}
function safeStringify(value, maxLength = 500) {
  const seen = /* @__PURE__ */ new WeakSet();
  let budget = maxLength;
  const walk = (current, depth) => {
    if (budget <= 0) {
      return "";
    }
    let out;
    if (current === null || typeof current !== "object") {
      if (typeof current === "string") {
        out = JSON.stringify(current.length > budget ? current.slice(0, budget) : current);
      } else if (typeof current === "bigint" || typeof current === "symbol") {
        out = String(current);
      } else if (typeof current === "function") {
        out = '"[Function]"';
      } else if (current === void 0) {
        out = "undefined";
      } else {
        out = JSON.stringify(current);
      }
      budget -= out.length;
      return out;
    }
    if (seen.has(current)) {
      budget -= 12;
      return '"[Circular]"';
    }
    if (depth >= 3) {
      budget -= 10;
      return Array.isArray(current) ? '"[Array]"' : '"[Object]"';
    }
    seen.add(current);
    if (Array.isArray(current)) {
      const items = [];
      for (const item of current.slice(0, 20)) {
        if (budget <= 0) break;
        items.push(walk(item, depth + 1));
      }
      budget -= 2;
      return `[${items.join(",")}]`;
    }
    const parts = [];
    for (const key of Object.keys(current).slice(0, 20)) {
      if (budget <= 0) break;
      budget -= key.length + 3;
      parts.push(
        `${JSON.stringify(key)}:${walk(current[key], depth + 1)}`
      );
    }
    budget -= 2;
    return `{${parts.join(",")}}`;
  };
  try {
    return truncateString(walk(value, 0), maxLength);
  } catch {
    return truncateString(String(value), maxLength);
  }
}

// resources/js/diagnostics/buffer.ts
function normalizeMaxEntries(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 ? Math.min(Math.floor(value), 500) : fallback;
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
    this.maxEntries = normalizeMaxEntries(maxEntries, 50);
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
var MAX_ARGUMENTS = 10;
var MAX_ARGUMENT_LENGTH = 500;
var ConsoleCollector = class {
  buffer = [];
  maxEntries = 20;
  installed = false;
  subscribers = 0;
  /**
   * Each installation gets a new version. A wrapper records only while its version is
   * active, so a wrapper left in place (because another library wrapped console after
   * it) passes calls through silently and a reinstall never records twice.
   */
  activeVersion = 0;
  versionCounter = 0;
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
    this.maxEntries = normalizeMaxEntries(maxEntries, 20);
    this.installed = true;
    this.subscribers = 1;
    const version = ++this.versionCounter;
    this.activeVersion = version;
    const originalError = console.error;
    const originalWarn = console.warn;
    this.originalError = originalError;
    this.originalWarn = originalWarn;
    this.wrappedError = (...args) => {
      if (this.activeVersion === version) {
        this.add("error", args);
      }
      originalError.apply(console, args);
    };
    console.error = this.wrappedError;
    this.wrappedWarn = (...args) => {
      if (this.activeVersion === version) {
        this.add("warn", args);
      }
      originalWarn.apply(console, args);
    };
    console.warn = this.wrappedWarn;
  }
  add(level, args) {
    const messages = args.slice(0, MAX_ARGUMENTS).map((arg) => {
      if (typeof arg === "string") {
        return truncateString(arg, MAX_ARGUMENT_LENGTH);
      }
      if (arg instanceof Error) {
        return truncateString(`${arg.name}: ${arg.message}`, MAX_ARGUMENT_LENGTH);
      }
      return safeStringify(arg, MAX_ARGUMENT_LENGTH);
    });
    if (args.length > MAX_ARGUMENTS) {
      messages.push(`...[${args.length - MAX_ARGUMENTS} more arguments]`);
    }
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
    this.activeVersion = 0;
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
    this.maxEntries = normalizeMaxEntries(maxEntries, 20);
    this.installed = true;
    this.subscribers = 1;
    this.errorHandler = (event) => {
      this.add({
        type: "error",
        message: truncateString(event.message, 500),
        source: event.filename ? truncateString(sanitizeUrl(event.filename), 255) : void 0,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack ? truncateString(sanitizeUrlsInText(String(event.error.stack)), 2e3) : void 0,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    };
    window.addEventListener("error", this.errorHandler);
    this.rejectionHandler = (event) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error && reason.stack ? truncateString(sanitizeUrlsInText(reason.stack), 2e3) : void 0;
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
  /**
   * Each installation gets a new version. A wrapper records only while its version is
   * active, so a wrapper left in place (because another library wrapped fetch/XHR after
   * it) passes requests through silently and a reinstall never records twice.
   */
  activeVersion = 0;
  versionCounter = 0;
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
    this.maxEntries = normalizeMaxEntries(maxEntries, 20);
    this.installed = true;
    this.subscribers = 1;
    const version = ++this.versionCounter;
    this.activeVersion = version;
    const isActive = () => this.activeVersion === version;
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
          if (!response.ok && isActive()) {
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
          if (isActive()) {
            self.add({
              method,
              url: sanitized,
              status: "NETWORK_ERROR",
              duration_ms: Math.round(performance.now() - start),
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
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
          if (isActive() && (this.status >= 400 || this.status === 0)) {
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
    this.activeVersion = 0;
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
var MAX_STORAGE_VALUE_LENGTH = 1024;
function readStorage(storage, key) {
  try {
    const value = storage.getItem(key);
    return value === null ? null : truncateString(value, MAX_STORAGE_VALUE_LENGTH);
  } catch {
    return null;
  }
}
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
        ls[key] = readStorage(localStorage, key);
      }
      storageData.local_storage = ls;
    }
    if (config.storage.sessionStorageKeys?.length && typeof sessionStorage !== "undefined") {
      const ss = {};
      for (const key of config.storage.sessionStorageKeys) {
        ss[key] = readStorage(sessionStorage, key);
      }
      storageData.session_storage = ss;
    }
    if (Object.keys(storageData).length > 0) {
      context.storage = storageData;
    }
  }
  const diagnostics = config?.diagnostics;
  if (diagnostics?.performance !== false) {
    const perf = getNormalizedPerformance();
    if (perf) {
      context.performance = perf;
    }
  }
  if (diagnostics?.errors) {
    const errors = errorCollector.get();
    if (errors.length > 0) {
      context.errors = errors;
    }
  }
  if (diagnostics?.console) {
    const consoleEntries = consoleCollector.get();
    if (consoleEntries.length > 0) {
      context.console = consoleEntries;
    }
  }
  if (diagnostics?.network) {
    const networkErrors = networkErrorCollector.get();
    if (networkErrors.length > 0) {
      context.network_errors = networkErrors;
    }
  }
  if (diagnostics?.breadcrumbs) {
    const breadcrumbs = breadcrumbsCollector.get();
    if (breadcrumbs.length > 0) {
      context.breadcrumbs = breadcrumbs;
    }
  }
  if (config?.metadata) {
    const appMeta = typeof config.metadata === "function" ? await config.metadata() : config.metadata;
    if (appMeta && typeof appMeta === "object") {
      context.application = appMeta;
    }
  }
  return context;
}

// resources/js/id.ts
function createId() {
  const cryptoApi = typeof crypto !== "undefined" ? crypto : void 0;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    try {
      return cryptoApi.randomUUID();
    } catch {
    }
  }
  const bytes = new Uint8Array(16);
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// resources/js/transport.ts
var DEFAULT_TIMEOUT_MS = 6e4;
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
function withTimeout(signal, timeoutMs) {
  const controller = new AbortController();
  let didTimeOut = false;
  let timer = null;
  const abortFromCaller = () => controller.abort(signal?.reason);
  if (signal?.aborted) {
    controller.abort(signal.reason);
  } else {
    signal?.addEventListener("abort", abortFromCaller, { once: true });
  }
  if (timeoutMs > 0 && Number.isFinite(timeoutMs)) {
    timer = setTimeout(() => {
      didTimeOut = true;
      controller.abort();
    }, timeoutMs);
  }
  return {
    signal: controller.signal,
    timedOut: () => didTimeOut,
    cleanup: () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
      signal?.removeEventListener("abort", abortFromCaller);
    }
  };
}
function resolveTimeout(config) {
  const timeout = config?.timeoutMs;
  return typeof timeout === "number" && timeout >= 0 ? timeout : DEFAULT_TIMEOUT_MS;
}
async function request(url, init, config, signal) {
  const timeoutMs = resolveTimeout(config);
  const timed = withTimeout(signal, timeoutMs);
  try {
    return await fetch(url, {
      credentials: "same-origin",
      ...init,
      signal: timed.signal
    });
  } catch (err) {
    if (timed.timedOut()) {
      throw new TimeoutError(timeoutMs);
    }
    if (signal?.aborted) {
      throw err;
    }
    throw new TransportError(
      `Network request failed: ${err instanceof Error ? err.message : String(err)}`
    );
  } finally {
    timed.cleanup();
  }
}
async function fetchAvailability(config, signal) {
  const url = config?.availabilityEndpoint || "/feedback-reporter/availability";
  const res = await request(
    url,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest"
      }
    },
    config,
    signal
  );
  if (res.status === 429) {
    throw new RateLimitError("Too many availability checks. Please wait before retrying.");
  }
  if (!res.ok) {
    return { available: false };
  }
  let data;
  try {
    data = await res.json();
  } catch {
    throw new TransportError("The availability response was not valid JSON.", res.status);
  }
  const available = data?.available === true;
  return available && data.limits !== void 0 ? { available, limits: normalizeLimits(data.limits) } : { available };
}
async function checkAvailability(config, signal) {
  try {
    return (await fetchAvailability(config, signal)).available;
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
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest"
  };
  const csrf = getCsrfToken(config);
  if (csrf) {
    headers["X-CSRF-TOKEN"] = csrf;
  }
  if (config?.headers) {
    const customHeaders = typeof config.headers === "function" ? await config.headers() : config.headers;
    Object.assign(headers, customHeaders);
  }
  const res = await request(url, { method: "POST", headers, body: formData }, config, signal);
  let responseBody = null;
  let isJson = true;
  try {
    responseBody = await res.json();
  } catch {
    isJson = false;
  }
  if (res.status === 200 || res.status === 201) {
    const body = responseBody;
    if (!isJson || typeof body?.id !== "string") {
      throw new TransportError(
        "The feedback response was not valid JSON.",
        res.status,
        responseBody
      );
    }
    return body;
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
  if (res.status === 419) {
    throw new SessionExpiredError(void 0, res.status);
  }
  if (res.status === 413) {
    throw new PayloadTooLargeError(void 0, res.status);
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
var MAX_PAGE_TITLE_LENGTH = 255;
var MAX_PAGE_URL_LENGTH = 2048;
function jsonDepth(value, depth = 0) {
  if (value === null || typeof value !== "object") {
    return depth;
  }
  let deepest = depth + 1;
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    deepest = Math.max(deepest, jsonDepth(child, depth + 1));
  }
  return deepest;
}
function byteLength(value) {
  return typeof TextEncoder !== "undefined" ? new TextEncoder().encode(value).length : value.length;
}
var FeedbackReporter = class {
  constructor(config = {}) {
    this.config = config;
    if (this.config.diagnostics) {
      this.initDiagnostics();
    }
  }
  config;
  activeDiagnostics = /* @__PURE__ */ new Set();
  serverLimits = null;
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
  /**
   * Return whether the reporter is available. Any failure is reported as `false`.
   */
  async isAvailable(signal) {
    try {
      return (await this.getAvailability(signal)).available;
    } catch (err) {
      if (signal?.aborted) {
        throw err;
      }
      return false;
    }
  }
  /**
   * Fetch availability and the server's limits. Rate limiting, timeouts, and network
   * failures are thrown as errors. The returned limits are reused by `submit()`.
   */
  async getAvailability(signal) {
    const availability = await fetchAvailability(this.config, signal);
    if (availability.limits) {
      this.serverLimits = availability.limits;
    }
    return availability;
  }
  /** The limits last advertised by the server, or the package defaults. */
  getLimits() {
    return resolveLimits(this.serverLimits);
  }
  async collectContext() {
    const ctx = await collectDiagnosticContext(this.config);
    this.config.callbacks?.onContextCollected?.(ctx);
    return ctx;
  }
  async submit(options) {
    this.config.callbacks?.onSubmitStart?.();
    try {
      const formData = await this.buildFormData(options);
      const response = await sendFeedbackReport(formData, this.config, options.signal);
      this.config.callbacks?.onSubmitSuccess?.(response);
      return response;
    } catch (err) {
      this.config.callbacks?.onSubmitError?.(err);
      throw err;
    }
  }
  async report(options) {
    const signal = options.signal;
    const availability = await this.getAvailability(signal);
    if (!availability.available) {
      throw new AvailabilityError("Feedback reporter is currently unavailable.", 200);
    }
    return this.submit(options);
  }
  async buildFormData(options) {
    const limits = this.getLimits();
    const preparedAttachments = prepareAttachments(options.attachments || [], limits);
    const formData = new FormData();
    formData.append("client_report_id", options.clientReportId || createId());
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
    formData.append("metadata", this.encodeMetadata(finalMetadata, limits));
    if (context.page) {
      if (context.page.url) {
        formData.append("page_url", String(context.page.url).slice(0, MAX_PAGE_URL_LENGTH));
      }
      if (context.page.title) {
        formData.append("page_title", String(context.page.title).slice(0, MAX_PAGE_TITLE_LENGTH));
      }
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
    return formData;
  }
  /**
   * Serialize metadata and reject it before upload when it would exceed the server's
   * size or depth limits. statusCode 0 marks the error as a client-side check.
   */
  encodeMetadata(metadata, limits) {
    const encoded = JSON.stringify(metadata);
    if (byteLength(encoded) > limits.maxMetadataBytes) {
      const message = `The metadata payload exceeds the maximum size of ${limits.maxMetadataBytes} bytes.`;
      throw new ValidationError(message, { metadata: [message] }, 0);
    }
    if (jsonDepth(metadata) > limits.maxMetadataDepth) {
      const message = `The metadata must be no deeper than ${limits.maxMetadataDepth} levels.`;
      throw new ValidationError(message, { metadata: [message] }, 0);
    }
    return encoded;
  }
};
function createFeedbackReporter(config) {
  return new FeedbackReporter(config);
}

export { AttachmentValidationError, AvailabilityError, DEFAULT_LIMITS, DEFAULT_TIMEOUT_MS, FeedbackReporter, FeedbackReporterError, PayloadTooLargeError, RateLimitError, ServerError, SessionExpiredError, TimeoutError, TransportError, ValidationError, breadcrumbsCollector, checkAvailability, collectDiagnosticContext, consoleCollector, createFeedbackReporter, createId, errorCollector, fetchAvailability, getCsrfToken, getNormalizedPerformance, networkErrorCollector, prepareAttachments, resolveLimits, safeStringify, sanitizeUrl, sanitizeUrlsInText, sendFeedbackReport, truncateString };
//# sourceMappingURL=chunk-OZ33U26D.js.map
//# sourceMappingURL=chunk-OZ33U26D.js.map