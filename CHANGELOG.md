# Changelog

All notable changes to `laravel-feedback-reporter` will be documented in this file.

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
