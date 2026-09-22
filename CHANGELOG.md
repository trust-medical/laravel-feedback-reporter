# Changelog

All notable changes to `laravel-feedback-reporter` will be documented in this file.

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
