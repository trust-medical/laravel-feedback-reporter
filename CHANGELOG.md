# Changelog

All notable changes to `laravel-feedback-reporter` will be documented in this file.

## Unreleased

### Added
- README section "Using the frontend without Laravel views": loading the Widget without a bundler (import map), the Laravel configuration for pages without a session (`availability.require_authentication`, `route.middleware`), CORS for pages on another origin, and protecting an anonymous endpoint.
- Tests that pin the defaults for Laravel-rendered pages (`web` middleware, session CSRF token, authentication required) and that the routes work for guests under the `api` middleware group.

### Changed
- The `headers` reporter option is now also sent with availability checks, not only with submissions, so a `FeedbackAvailability` policy can rely on a header supplied by the frontend.
- The default `SessionExpiredError` message now points to the CSRF settings of the reporter routes for pages that Laravel does not render.

## 4.4.0 - 2026-09-28

### Added
- The availability endpoint returns the server's upload, message, and metadata `limits` when the reporter is available. The SDK, Alpine adapter, and Widget apply them before uploading.
- `retention.days` and `Prunable` support for `FeedbackReport`. Deleting reports or attachments through Eloquent, or pruning them, also deletes their stored files.
- `attachments.max_pixels` (default 40,000,000) rejects images with excessive pixel counts.
- Indexes on `feedback_reports.created_at` and `feedback_attachments (feedback_report_id, sort_order)`.
- SDK: `getAvailability()`, `getLimits()`, `fetchAvailability()`, `createId()`, the `clientReportId` submit option, and the `timeoutMs` config (default 60000).
- SDK errors: `SessionExpiredError` (419), `PayloadTooLargeError` (413), and `TimeoutError`.
- Alpine adapter: `destroy()`, `markEdited()`, `fieldErrors`, `lastError`, and `clientReportId`.
- `sanitizeUrl` now implements `query.mode: 'exclude'`.
- The Workbench runs with `make serve`.

### Changed
- A repeated `client_report_id` from the same submitter returns the existing report with `200` and `"duplicate": true` instead of 422. This applies to concurrent duplicates too. A key used by another submitter is still rejected with 422. `client_report_id` must match `^[A-Za-z0-9_-]{8,64}$`.
- Invalid, oversized, or too deeply nested metadata now returns 422 before any file is written, instead of 500. Scalar JSON metadata is rejected.
- Package routes always respond with JSON.
- The Widget and Alpine adapter reuse one `client_report_id` per draft across retries.
- Diagnostic context includes only the continuous collectors enabled by the reporter that submits.
- The Composer package now requires `laravel/framework` and `ext-fileinfo` instead of individual `illuminate/*` packages, matching the framework classes it uses.
- When a published configuration omits `availability.environments`, the package falls back to `local` and `staging` instead of all environments.
- `FeedbackReport` hides `ip_address` and `user_agent` when serialized. Stored User-Agent values are truncated to 1024 characters.

### Fixed
- An exception in a `FeedbackStored` listener no longer deletes the files of a report that was already committed. The event is dispatched after the outermost transaction commits.
- Out-of-range viewport or screen values, an empty `allowed_mimes` list, and a missing policy class no longer cause 500 errors.
- The Widget works on non-secure origins, where `crypto.randomUUID()` is unavailable. When the reporter is unavailable, it shows a visible message. Requests are aborted when the Widget is closed or disconnected. All errors are localized. The Widget can be imported during SSR. It applies a `config` assigned after connection or before upgrade.
- Empty `route-name` and `panel-id` attributes are treated as unset.
- The SDK truncates `page_title` and `page_url` to the server limits and rejects oversized metadata before uploading.
- The Workbench serves the built Widget and Konva and works without a login.

### Security
- `page_url` must use `http` or `https`.
- Unavailable responses no longer include a message that identifies the package. `disabled_response` accepts only 403 or 404.
- Attachments are stored with private visibility. Stored extensions come from the detected MIME type, not the client filename.
- Error filenames, stack URLs, storage values, and console arguments are sanitized or bounded before they are reported.
- CI runs weekly and audits Composer dependencies after resolving each Laravel version.

## 4.3.0 - 2026-09-28

### Added
- Published the repository on GitHub. The Laravel and frontend packages are installed from GitHub via a Composer VCS repository and an npm Git tag.
- Added a separate `feedback-reporter-availability` rate limiter for the availability endpoint, configured by `rate_limit.availability_max_attempts` (default 60) and `rate_limit.availability_decay_minutes` (default 1).
- Added a Code of Conduct, issue and pull request templates, and `.gitattributes` export rules that exclude development files from installed archives.

### Changed
- CI now runs PHP 8.3–8.5 and Node.js 22/24, runs Biome, and fails when the committed `dist/` does not match a fresh build.
- The frontend package now requires Node.js 22 or later (`engines.node >=22`) because Node.js 20 has reached end of life.
- Updated the security contact and supported versions, and described the vulnerability response as best effort.

### Security
- A configured `availability.policy` that does not implement `FeedbackAvailability` now makes the reporter unavailable instead of being ignored.
- The availability endpoint is now rate limited.

## 4.2.1 - 2026-09-24

### Changed
- Reduced the annotation toolbar gap to 4px for a more compact control layout.

## 4.2.0 - 2026-09-24

### Changed
- Removed the annotation clear-all and fit-to-view controls.
- Renamed “Delete selection” to “Delete shape.”
- Added inline Lucide icons to Move, Hand tool, Rectangle, Arrow, Undo, and Delete shape while retaining visible text labels.

## 4.1.0 - 2026-09-24

### Added
- Added per-attachment removal controls and a hand tool for panning zoomed images inside the editor viewport.
- Added GUI controls for every annotation editing action and automatic dialog closure after an announced successful submission.

### Changed
- Renamed the annotation “Select” tool to “Move” and moved the annotation toolbar below the image viewport.
- Fixed the Widget modal workspace size so zooming changes only the scrollable canvas content.
- Increased interactive Konva layer backing density up to the useful source-image and maximum-zoom density to reduce blur without changing logical coordinates or export resolution.
- Removed annotation keyboard shortcuts and their help text in favor of visible, accessible controls.

## 4.0.0 - 2026-09-24

### Added
- Added the explicitly registered `<trust-feedback-reporter>` Web Component in a separate `@trust-medical/feedback-reporter/widget` entry.
- Added isolated open Shadow DOM styles, English/Japanese UI, manual image upload, annotations, per-image zoom, fit, undo, deletion, and image switching.
- Added safe reference counting and teardown for opt-in diagnostic collectors.

### Changed
- **BREAKING**: Feedback now uses a required message and optional user-created screenshots or image attachments instead of DOM capture.
- **BREAKING**: Attachment sources are now `user_screenshot` and `attachment`. The migration irreversibly maps existing `automatic_capture` rows to `user_screenshot`.
- Continuous console, fetch, XHR, error, and breadcrumb instrumentation is disabled unless explicitly enabled. Error collection now uses a non-cancelling event listener.
- Moved Konva into the Widget entry's dependency graph while keeping headless consumers on a separate entry.

### Removed
- **BREAKING**: Removed `captureScreenshot()`, `FeedbackReporter.capture()`, `CaptureOptions`, `CaptureError`, capture options, callbacks, and capture metadata.
- Removed `html-to-image`, `html2canvas-pro`, DOM redaction/ignore behavior, and capture-specific CORS handling.

### Security
- Diagnostic global wrappers only restore themselves when still active, preventing teardown from overwriting integrations installed later.
- Documented that Shadow DOM provides style and DOM encapsulation, not a security boundary against same-page scripts.

## 3.0.0 - 2026-09-22

### Changed
- **BREAKING**: Renamed the frontend npm package from `@trustmedical/feedback-reporter` to `@trust-medical/feedback-reporter`.
- Updated the English and Japanese installation guides and Laravel integration prompts to use the new npm scope.
- Migrated the Biome configuration to the 2.5 schema used by the current development dependency.

## 2.0.0 - 2026-09-21

### Changed
- **BREAKING**: Dropped PHP 8.2 support; PHP 8.3+ is now required for all supported Laravel versions.
- Upgraded `pestphp/pest` and `pestphp/pest-plugin-laravel` from `^3.0` to `^4.0` to add Laravel 13 test coverage (the v3 line of `pest-plugin-laravel` never added Laravel 13 support).

### Fixed
- Fixed CI workflow using an invalid pinned commit SHA for `shivammathur/setup-php`, which caused every PHP job to fail with "Unable to resolve action".
- Fixed `composer audit` running before dependencies were installed in CI, causing every PHP job to fail with "No installed packages found".
- Added a missing `phpunit.xml`; without it, Pest generated a temporary config file guarded by `assert()`, which GitHub Actions' production `php.ini` (`zend.assertions=-1`) silently skipped, corrupting Pest's CLI argument parsing.

## 1.0.0 - 2026-09-19

### Added
- Initial production-ready release supporting Laravel 12 & 13 (PHP 8.2+).
- Headless architecture with zero opinionated UI components.
- Multi-dimensional Availability Checker (Environment, Auth, IP/CIDR deny/allow, Gate, Custom Policy).
- Flexible image attachments (Automatic capture via `html-to-image`, manual user screenshot, and arbitrary image attachments).
- All-or-nothing storage atomicity with automatic orphan file cleanup on failure.
- ULID primary keys for `feedback_reports` and `feedback_attachments`.
- Client idempotency key support (`client_report_id`) to prevent duplicate submissions.
- Privacy safeguards: automatic redaction (`data-feedback-redact`), ignore filter (`data-feedback-ignore`), password input filtering, and URL query/hash sanitization.
- Diagnostic context collectors: client, page, viewport, screen, browser, network, normalized performance, recent JS errors, console logs, failed network requests, and breadcrumbs.
- `FeedbackStored` Laravel event dispatched after database commit and safe storage.
- Named rate limiter `feedback-reporter` (default 10 requests / min).
- Lightweight Alpine.js adapter (`createAlpineFeedbackReporter`).
- Orchestra Workbench development sandbox.
- Comprehensive test suites with Pest and Vitest.
