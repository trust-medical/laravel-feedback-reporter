# Changelog

All notable changes to `laravel-feedback-reporter` will be documented in this file.

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
