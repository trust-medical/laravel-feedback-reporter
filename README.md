# Laravel Feedback Reporter

[English](README.md) | [日本語](README.ja.md)

A feedback reporting package for Laravel 12 and 13. It combines a secure Laravel ingestion endpoint with a TypeScript SDK and an optional, isolated Web Component for submitting messages, manually captured screenshots, image annotations, and diagnostic context.

[![Tests & Code Quality](https://github.com/trust-medical/laravel-feedback-reporter/actions/workflows/tests.yml/badge.svg)](https://github.com/trust-medical/laravel-feedback-reporter/actions/workflows/tests.yml)
[![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg)](LICENSE)

## Overview

Laravel Feedback Reporter submits and stores messages, user-provided images, and diagnostic context in a Laravel application.

- a required feedback message with optional PNG, JPEG, or WebP images;
- an official `<trust-feedback-reporter>` isolated with Shadow DOM;
- multiple images, attachment removal, zoom, Move, Hand, Rectangle, Arrow, Undo, and Delete shape;
- diagnostic context for the page, viewport, screen, browser, and performance;
- availability rules for environment, authentication, IP/CIDR, Gate, and custom policy;
- private storage, MIME validation, rate limiting, idempotency, and atomic cleanup;
- a `FeedbackStored` event for application notifications and workflows.

Users select images captured or prepared on their device, add annotations when needed, and submit them as ordinary files.

### Package layers

| Layer | Provides |
| --- | --- |
| Laravel package | Availability checks, ingestion routes, validation, private storage, models, and a stored event |
| `@trust-medical/feedback-reporter/widget` | Official Japanese/English Web Component |
| `@trust-medical/feedback-reporter` | Headless TypeScript SDK for custom interfaces |
| `@trust-medical/feedback-reporter/alpine` | Alpine.js state adapter |

Only the Widget entry loads Konva and the image editor. The headless entry contains only submission and diagnostic collection code.

The package passes stored data to the application. Review screens, attachment previews and downloads, notification destinations, and retention policies can follow the application's authorization and operational requirements.

## Requirements

- PHP 8.3 or later
- Laravel 12 or 13
- Composer 2
- Node.js 22 or later when using the TypeScript SDK or Web Component

## Installation

The package is distributed from GitHub rather than Packagist or the npm registry. Add the repository to the application's `composer.json`:

```json
{
    "repositories": [
        {
            "type": "vcs",
            "url": "https://github.com/trust-medical/laravel-feedback-reporter"
        }
    ]
}
```

Then install the Laravel package. Composer resolves versions from the repository's Git tags:

```bash
composer require trust-medical/laravel-feedback-reporter:^4.3
php artisan vendor:publish --tag=feedback-reporter-config
```

The package loads its migrations automatically. When the application needs to own or review local copies, publish them before migrating:

```bash
php artisan vendor:publish --tag=feedback-reporter-migrations
php artisan migrate
```

Otherwise, run `php artisan migrate` without publishing them.

Enable reporting in `.env`:

```dotenv
FEEDBACK_REPORTER_ENABLED=true
```

Install the frontend package from a Git tag when using the Widget or headless SDK:

```bash
npm install github:trust-medical/laravel-feedback-reporter#v4.3.0
```

The package keeps its `@trust-medical/feedback-reporter` import name. npm pins the Git tag instead of a semver range, so change the tag explicitly when upgrading.

Layouts that submit from the frontend must provide Laravel's CSRF token:

```blade
<meta name="csrf-token" content="{{ csrf_token() }}">
```

## Availability and routes

The default configuration allows authenticated users in the `local` and `staging` environments. Every configured availability condition must pass:

- package master switch;
- current application environment;
- authentication requirement;
- IP/CIDR denylist, then allowlist;
- optional Laravel Gate;
- optional class implementing `FeedbackAvailability`. A configured class that does not implement the contract makes the reporter unavailable.

Review `config/feedback-reporter.php` before enabling the package outside local development. Returning 404 for unavailable requests is the default and avoids advertising the endpoint.

The default routes are:

| Method | URI | Route name | Purpose |
| --- | --- | --- | --- |
| `GET` | `/feedback-reporter/availability` | `feedback-reporter.availability` | Returns `{"available": true|false}` |
| `POST` | `/feedback-reporter/reports` | `feedback-reporter.store` | Validates and stores a report |

The POST route applies the availability middleware and the `feedback-reporter` rate limiter. The default limit is ten submissions per minute, keyed by authenticated user ID or client IP. The GET route uses a separate `feedback-reporter-availability` limiter, sixty checks per minute by default, so availability checks do not consume the submission limit.

Route prefix, name prefix, domain, middleware, and individual paths are configurable. To own route registration, set `FEEDBACK_REPORTER_REGISTER_ROUTES=false` or call `FeedbackReporter::ignoreRoutes()`, then register the package routes with application-specific options:

```php
namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use TrustMedical\FeedbackReporter\FeedbackReporter;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        FeedbackReporter::ignoreRoutes();
    }

    public function boot(): void
    {
        FeedbackReporter::routes(options: [
            'prefix' => 'support/feedback',
            'as' => 'support.feedback.',
            'middleware' => ['web', 'auth'],
        ]);
    }
}
```

## Web Component

The Widget is the quickest way to add the reporter. It is published from a separate entry, so applications using only the headless SDK do not load Konva or Widget code.

Register it once in a frontend entry:

```ts
import { registerFeedbackReporterElement } from '@trust-medical/feedback-reporter/widget'

registerFeedbackReporterElement()
```

Render the element in a shared Blade layout:

```blade
<trust-feedback-reporter
    endpoint="{{ route('feedback-reporter.store') }}"
    availability-endpoint="{{ route('feedback-reporter.availability') }}"
    source-type="web_site"
    route-name="{{ Route::currentRouteName() }}"
    lang="en"
    color-scheme="auto"
></trust-feedback-reporter>
```

Registration is explicit and idempotent. A custom element name can be registered with `registerFeedbackReporterElement('my-feedback-reporter')`.

### Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `endpoint` | `/feedback-reporter/reports` | Report submission URL |
| `availability-endpoint` | `/feedback-reporter/availability` | Availability check URL |
| `source-type` | `web_site` | Application-defined source value stored in report metadata |
| `route-name` | none | Current application route stored in report metadata |
| `panel-id` | none | Optional administration panel identifier |
| `lang` | document language | Japanese when the language starts with `ja`; English otherwise |
| `color-scheme` | `auto` | `auto`, `light`, or `dark` |

`source-type` is an application-defined value stored in report metadata. It is separate from an attachment's `source` value described below.

The element exposes asynchronous `open()` and synchronous `close()` methods.

### Image editor

The built-in Widget accepts up to five PNG, JPEG, or WebP images, limited to 5 MB each and 20 MB in total. A message is always required; images are optional. The server enforces independent limits, so custom server configuration should remain compatible with the Widget's fixed limits.

For each image, users can:

- remove an attached image before submission;
- draw rectangles and arrows, then move, resize, or delete them;
- pan a zoomed image with the hand tool;
- undo or delete a selected shape with visible, icon-labelled controls;
- zoom between 50% and 200% in 25% steps;
- switch between images without losing the image's zoom or annotation state.

The editor stays within a fixed modal workspace while zoomed content scrolls inside its viewport. Display zoom uses CSS and does not reduce logical coordinates or exported resolution. Konva layers use a higher-density backing canvas, up to the useful source-image and maximum-zoom density, to reduce blur when zooming. Unedited images are uploaded unchanged; edited images are exported with their annotations. After a successful submission, the Widget announces completion and closes the dialog. Widget uploads use the `attachment` source.

### Isolation and lifecycle

The Widget renders its markup and bundled CSS in an open Shadow DOM. It does not require Tailwind or host styles, and its DOM queries and event handling stay within the Shadow Root or dialog. Disconnecting the element releases diagnostic subscriptions, Konva stages, and object URLs.

Shadow DOM prevents accidental CSS and selector conflicts. It is not a security boundary against scripts already executing in the same page.

### Programmatic configuration

Set `config` before connecting the element when headers, callbacks, metadata, URL filtering, or opt-in diagnostics are required:

```ts
import {
    FeedbackReporterElement,
    registerFeedbackReporterElement,
} from '@trust-medical/feedback-reporter/widget'

registerFeedbackReporterElement()

const widget = document.createElement(
    'trust-feedback-reporter',
) as FeedbackReporterElement

widget.config = {
    endpoint: '/feedback-reporter/reports',
    availabilityEndpoint: '/feedback-reporter/availability',
    sourceType: 'admin_panel',
    routeName: 'orders.show',
    panelId: 'admin',
    reporter: {
        diagnostics: {
            errors: true,
            performance: true,
        },
        metadata: {
            application: 'back-office',
        },
    },
}

document.body.append(widget)
```

## Headless TypeScript SDK

Use the headless entry to build a custom interface without loading Widget code. Pass user-selected images through `attachments`.

```ts
import { createFeedbackReporter } from '@trust-medical/feedback-reporter'

const reporter = createFeedbackReporter({
    endpoint: '/feedback-reporter/reports',
    availabilityEndpoint: '/feedback-reporter/availability',
})

const input = document.querySelector<HTMLInputElement>('#feedback-images')
const files = Array.from(input?.files ?? [])

const response = await reporter.report({
    message: 'The save button did not complete the operation.',
    attachments: files.map((file) => ({
        file,
        source: 'attachment',
    })),
})

console.log(response.id)
```

`report()` checks availability before collecting context and submitting. `submit()` skips the availability request, then collects context and submits. `isAvailable()`, `collectContext()`, `initDiagnostics()`, and `destroyDiagnostics()` are also public.

The SDK maps server responses to `AvailabilityError`, `AttachmentValidationError`, `ValidationError`, `RateLimitError`, `ServerError`, or `TransportError`.

Configuration supports custom CSRF resolution, synchronous or asynchronous headers, URL sanitization, storage-key allowlists, synchronous or asynchronous metadata, diagnostics, and lifecycle callbacks. The SDK reads Laravel's `meta[name="csrf-token"]` by default. Do not set a multipart `Content-Type` header manually; the browser adds the required `FormData` boundary.

### Alpine adapter

```ts
import { createAlpineFeedbackReporter } from '@trust-medical/feedback-reporter/alpine'

Alpine.data('feedbackReporter', () =>
    createAlpineFeedbackReporter({
        endpoint: '/feedback-reporter/reports',
        availabilityEndpoint: '/feedback-reporter/availability',
    }),
)
```

The adapter exposes message, attachments, availability, submission state, the latest response, attachment helpers, and `submit()`. `addAttachment()` defaults to the `attachment` source.

## Diagnostic context and privacy

At submission time, the SDK collects a bounded snapshot of:

- sanitized page URL, origin, pathname, title, and referrer;
- viewport, scroll position, screen, locale, timezone, and browser capabilities;
- network state and normalized performance data;
- the active element's tag, ID, and class names;
- application metadata and explicitly allowlisted storage values.

Query values and URL hashes are excluded by default. Query values can only be included through an allowlist; hashes require explicit opt-in. Browser storage values are not read unless exact keys are configured.

Continuous collectors are disabled by default:

| Option | Behavior when enabled |
| --- | --- |
| `errors` | Observes errors and unhandled rejections without replacing `window.onerror` |
| `console` | Wraps `console.error` and `console.warn` |
| `network` | Wraps `fetch` and XMLHttpRequest and records failures |
| `breadcrumbs` | Records bounded click, submit, and navigation metadata |
| `performance` | Includes the submission-time performance snapshot; enabled unless set to `false` |

Global wrappers are reference-counted and are restored only while they remain the active wrapper. Call `destroyDiagnostics()` when disposing a headless reporter that enabled continuous collectors.

The SDK does not intentionally collect password values, cookies, authorization headers, CSRF token values, request or response bodies, or unrestricted storage. The server independently records the authenticated user ID, client IP, User-Agent, receipt time, route, host, and configured runtime versions. Review custom metadata and explicitly enabled diagnostics for personal or regulated data.

## Storage and application integration

Reports and attachments use ULID primary keys. Attachment files are written to:

```text
{storage.path}/{YYYY}/{MM}/{DD}/{report ULID}/{attachment ULID}.{extension}
```

The default disk is `local`. Keep uploads private and expose previews or downloads only through application routes protected by a Gate or policy. SVG is excluded by default. The server validates image content, per-file size, file count, total size, metadata byte size, and metadata nesting depth.

Database writes run in a transaction, and failures remove files already written so orphaned uploads are not left behind. The unique `client_report_id` prevents the same client identifier from being stored twice.

After a report and its attachments are stored, the package dispatches `FeedbackStored`:

```php
use TrustMedical\FeedbackReporter\Events\FeedbackStored;

final class QueueFeedbackNotification
{
    public function handle(FeedbackStored $event): void
    {
        SendFeedbackNotification::dispatch($event->feedback->getKey());
    }
}
```

Use `FeedbackReport` and its ordered `attachments` relationship to build an application-specific review screen. Queue slow notification or external integration work instead of performing it in the submission request.

## Configuration reference

The published `config/feedback-reporter.php` groups settings under:

- `enabled`: master switch;
- `availability`: environments, authentication, IP rules, Gate, policy, and denial status;
- `route`: registration, prefix, name prefix, domain, middleware, and paths;
- `rate_limit`: maximum attempts and decay interval for submissions and availability checks;
- `storage`: private disk and base path;
- `attachments`: count, size, total size, and allowed MIME types;
- `metadata`: maximum encoded bytes and nesting depth;
- `server_context`: environment, Laravel version, and PHP version switches.

Environment variables are read by the configuration file. Application code should use `config()` so Laravel configuration caching continues to work.

## Development and security

```bash
vendor/bin/pest
vendor/bin/phpstan analyse
vendor/bin/pint
npm run lint
npm run typecheck
npm test
npm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the Docker and Workbench workflow, [CHANGELOG.md](CHANGELOG.md) for release history, and [SECURITY.md](SECURITY.md) for vulnerability reporting.
