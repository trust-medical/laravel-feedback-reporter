# Laravel Feedback Reporter

[English](README.md) | [日本語](README.ja.md)

Laravel 12/13 feedback reporting with manual screenshot uploads, image annotations, diagnostic context, and an optional Shadow DOM Web Component.

[![Tests & Code Quality](https://github.com/trust-medical/laravel-feedback-reporter/actions/workflows/tests.yml/badge.svg)](https://github.com/trust-medical/laravel-feedback-reporter/actions/workflows/tests.yml)
[![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg)](LICENSE)

## What v4 does

- Stores a required feedback message and up to five optional PNG, JPEG, or WebP images.
- Accepts screenshots taken by the user instead of reconstructing the page DOM.
- Provides an optional `<trust-feedback-reporter>` UI with zoom, fit, rectangles, arrows, undo, deletion, and multiple-image switching.
- Keeps the Widget's markup and CSS inside an open Shadow DOM.
- Collects bounded diagnostic context without capturing passwords, cookies, authorization headers, CSRF tokens, or request/response bodies.
- Dispatches `FeedbackStored` after a report and its attachments are committed.

The Shadow DOM prevents accidental CSS and DOM-selector conflicts. It is not a security boundary against malicious scripts running in the same page.

## Requirements and installation

- PHP 8.3+
- Laravel 12 or 13
- Node.js 20+ when using the JavaScript SDK

```bash
composer require trust-medical/laravel-feedback-reporter
php artisan vendor:publish --tag=feedback-reporter-config
php artisan vendor:publish --tag=feedback-reporter-migrations
php artisan migrate
npm install @trust-medical/feedback-reporter
```

Enable the package and review its availability policy:

```dotenv
FEEDBACK_REPORTER_ENABLED=true
```

By default, reporting is restricted to authenticated users in `local` and `staging`. Configure environments, authentication, IP/CIDR rules, a Gate, or a custom policy in `config/feedback-reporter.php`. Uploaded files should use a private storage disk.

The package registers:

- `GET /feedback-reporter/availability`
- `POST /feedback-reporter/reports`

Route prefix, names, middleware, domain, and paths are configurable. Call `FeedbackReporter::ignoreRoutes()` before boot or set `FEEDBACK_REPORTER_REGISTER_ROUTES=false` when registering your own routes with `FeedbackReporter::routes()`.

## Official Web Component

The Widget entry is separate, so headless consumers do not load Konva or UI code.

```ts
import {
    registerFeedbackReporterElement,
} from '@trust-medical/feedback-reporter/widget'

registerFeedbackReporterElement()
```

```blade
<trust-feedback-reporter
    endpoint="{{ route('feedback-reporter.store') }}"
    availability-endpoint="{{ route('feedback-reporter.availability') }}"
    source-type="web_site"
    route-name="{{ Route::currentRouteName() }}"
    panel-id="admin"
    lang="en"
    color-scheme="auto"
></trust-feedback-reporter>
```

Registration is explicit and idempotent. A different tag name can be supplied to `registerFeedbackReporterElement('my-feedback')`. Supported display values are `light`, `dark`, and `auto`; language is selected from the element's `lang` or the document language and currently supports English and Japanese.

For callbacks, headers, metadata, URL filtering, or opt-in diagnostics, set `config` before connecting the element:

```ts
import {
    FeedbackReporterElement,
    registerFeedbackReporterElement,
} from '@trust-medical/feedback-reporter/widget'

registerFeedbackReporterElement()

const widget = document.createElement('trust-feedback-reporter') as FeedbackReporterElement
widget.config = {
    endpoint: '/feedback-reporter/reports',
    availabilityEndpoint: '/feedback-reporter/availability',
    sourceType: 'admin',
    reporter: {
        diagnostics: { errors: true, performance: true },
    },
}
document.body.append(widget)
```

Disconnecting the element releases Konva stages, object URLs, and diagnostic listeners. The Widget does not require Tailwind or host-page CSS.

## Headless SDK

```ts
import { createFeedbackReporter } from '@trust-medical/feedback-reporter'

const reporter = createFeedbackReporter({
    endpoint: '/feedback-reporter/reports',
    availabilityEndpoint: '/feedback-reporter/availability',
})

await reporter.report({
    message: 'The save action did not complete.',
    attachments: screenshot
        ? [{ file: screenshot, source: 'user_screenshot' }]
        : [],
})
```

`report()` checks availability, collects configured context, and submits. `submit()` skips the availability request. Attachment sources are `user_screenshot` and `attachment`.

An Alpine adapter remains available from `@trust-medical/feedback-reporter/alpine`.

## Diagnostics and privacy

Basic page, viewport, screen, browser, network-state, active-element, and configured metadata are collected at submission. Continuous instrumentation is disabled unless explicitly enabled:

```ts
const reporter = createFeedbackReporter({
    diagnostics: {
        errors: true,
        performance: true,
        console: false,
        network: false,
        breadcrumbs: false,
    },
})
```

Error collection uses a non-cancelling `error` event listener. Console, `fetch`, and XHR monitoring wrap globals and are therefore opt-in. Collectors are reference-counted and only restore a wrapper when it is still the active implementation, avoiding overwriting later integrations.

URL query values and hashes are excluded by default. Storage values are never collected unless keys are allowlisted. Review all enabled diagnostics and metadata for personal or regulated data before production use.

## Backend integration

Subscribe to the committed event instead of sending notifications from the request:

```php
use TrustMedical\FeedbackReporter\Events\FeedbackStored;

Event::listen(FeedbackStored::class, function (FeedbackStored $event): void {
    SendFeedbackNotification::dispatch($event->feedbackReport->getKey());
});
```

Models use ULIDs. Writes and attachments are atomic, uploads are MIME-validated, metadata size/depth is bounded, client report IDs provide idempotency, and the default rate limit is ten requests per minute.

## Upgrading from v3

Version 4 removes `captureScreenshot()`, `FeedbackReporter.capture()`, `CaptureOptions`, `CaptureError`, all capture configuration/callbacks/metadata, and the `html-to-image`/`html2canvas-pro` dependencies. Remove capture options and submit user-created files instead.

The v4 migration irreversibly changes existing attachment rows with source `automatic_capture` to `user_screenshot`. Historical JSON metadata is not rewritten.

## Development

```bash
vendor/bin/pest
vendor/bin/phpstan analyse
vendor/bin/pint
npm run lint
npm run typecheck
npm test
npm run build
```

The Workbench loads the same packaged Web Component for manual browser verification. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
