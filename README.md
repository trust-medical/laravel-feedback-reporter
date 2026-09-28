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
- private storage, MIME and pixel-count validation, rate limiting, idempotent retries, and retention pruning;
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
composer require trust-medical/laravel-feedback-reporter:^4.4
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
npm install github:trust-medical/laravel-feedback-reporter#v4.4.0
```

The package keeps its `@trust-medical/feedback-reporter` import name. npm pins the Git tag instead of a semver range, so change the tag explicitly when upgrading.

Layouts that submit from the frontend must provide Laravel's CSRF token:

```blade
<meta name="csrf-token" content="{{ csrf_token() }}">
```

PHP's `upload_max_filesize` and `post_max_size`, and any proxy limit such as nginx `client_max_body_size`, must allow the configured attachment limits: 5 MB per file and 20 MB per request by default, plus the form fields. Otherwise uploads fail with 413 or a validation error before they reach the package.

## Availability and routes

The default configuration allows authenticated users in the `local` and `staging` environments. Every configured availability condition must pass:

- package master switch;
- current application environment;
- authentication requirement;
- IP/CIDR denylist, then allowlist;
- optional Laravel Gate;
- optional class implementing `FeedbackAvailability`. A configured class that does not implement the contract makes the reporter unavailable.

Review `config/feedback-reporter.php` before enabling the package outside local development. Unavailable submissions receive a 404 with no message by default, which avoids advertising the endpoint. `disabled_response` accepts 403 or 404; other values fall back to 404.

IP rules and the per-IP rate limit use `$request->ip()`. Behind a load balancer or reverse proxy, configure Laravel's trusted proxies so the client IP is correct, and never trust forwarded headers from arbitrary sources. The recorded `host` is read from the request, so configure trusted hosts when it matters.

The default routes are:

| Method | URI | Route name | Purpose |
| --- | --- | --- | --- |
| `GET` | `/feedback-reporter/availability` | `feedback-reporter.availability` | Returns availability and, when available, the upload limits |
| `POST` | `/feedback-reporter/reports` | `feedback-reporter.store` | Validates and stores a report |

Both routes always respond with JSON, even when the request has no `Accept` header. An available response includes the limits the frontend applies before uploading:

```json
{
    "available": true,
    "limits": {
        "max_files": 5,
        "max_file_size_kb": 5120,
        "max_total_size_kb": 20480,
        "allowed_mimes": ["image/png", "image/jpeg", "image/webp"],
        "max_message_length": 10000,
        "max_metadata_bytes": 262144,
        "max_metadata_depth": 10
    }
}
```

An unavailable response is `{"available": false}`. A new report returns `201` with `{"id": "...", "success": true}`. A retry with the same `client_report_id` returns `200` with `"duplicate": true` (see [Storage and application integration](#storage-and-application-integration)).

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

`source-type` is an application-defined value stored in report metadata. It is separate from an attachment's `source` value described below. Attributes take precedence over the `config` property. Empty `route-name` and `panel-id` attributes, such as an unnamed route, are treated as unset.

The element exposes asynchronous `open()` and synchronous `close()` methods.

### Image editor

The Widget reads the image count, per-file size, total size, and MIME limits from the availability response, so its checks and hints follow the server configuration. With a server that does not return `limits`, it uses the defaults: up to five PNG, JPEG, or WebP images, 5 MB each and 20 MB in total. A message is always required and must not be blank; images are optional. The server validates independently.

For each image, users can:

- remove an attached image before submission;
- draw rectangles and arrows, then move, resize, or delete them;
- pan a zoomed image with the hand tool;
- undo or delete a selected shape with visible, icon-labelled controls;
- zoom between 50% and 200% in 25% steps;
- switch between images without losing the image's zoom or annotation state.

The editor stays within a fixed modal workspace while zoomed content scrolls inside its viewport. Display zoom uses CSS and does not reduce logical coordinates or exported resolution. Konva layers use a higher-density backing canvas, up to the useful source-image and maximum-zoom density, to reduce blur when zooming. Unedited images are uploaded unchanged; edited images are exported with their annotations. After a successful submission, the Widget announces completion and closes the dialog. Widget uploads use the `attachment` source.

If a submission fails, retrying from the same draft reuses its `client_report_id`, so a request the server already stored is not duplicated. Closing the dialog or disconnecting the element aborts an in-flight request. When the reporter is unavailable, the dialog opens with a visible message and a disabled form. Errors, including an expired session (419), an oversized request (413), and timeouts, are shown in the Widget's language.

### Isolation and lifecycle

The Widget renders its markup and bundled CSS in an open Shadow DOM. It does not require Tailwind or host styles, and its DOM queries and event handling stay within the Shadow Root or dialog. Disconnecting the element aborts pending requests and releases diagnostic subscriptions, Konva stages, and object URLs.

The Widget module can be imported during server-side rendering; the custom element class is defined when `registerFeedbackReporterElement()` runs in a browser.

Shadow DOM prevents accidental CSS and selector conflicts. It is not a security boundary against scripts already executing in the same page.

### Programmatic configuration

Set `config` when headers, callbacks, metadata, URL filtering, timeouts, or opt-in diagnostics are required. Assign it before connecting the element when possible: a value assigned before the element is defined is applied when it upgrades, and assigning after connection rebuilds the Widget and discards an unsent draft.

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
        timeoutMs: 60000,
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

`report()` calls `getAvailability()` before collecting context and submitting. `submit()` skips the availability request, then collects context and submits. Other public methods:

- `getAvailability()` returns `{ available, limits? }` and caches the server limits that `submit()` checks before uploading;
- `getLimits()` returns the cached server limits or the defaults;
- `isAvailable()` returns a boolean and treats any failure as unavailable;
- `collectContext()`, `initDiagnostics()`, and `destroyDiagnostics()`.

Before uploading, the SDK checks attachment count, per-file size, total size, and MIME type, rejects metadata over the size or depth limit, and truncates `page_title` to 255 characters and `page_url` to 2048. Pass `clientReportId` to `submit()` or `report()` when retrying the same report; it must match `^[A-Za-z0-9_-]{8,64}$`, and one is generated when omitted. `timeoutMs` (default `60000`, `0` disables) applies to availability checks and submissions. Requests use `credentials: 'same-origin'`.

| Situation | Error |
| --- | --- |
| Client-side attachment check fails | `AttachmentValidationError` |
| `422`, or metadata over the limit before sending (`statusCode` `0`) | `ValidationError` |
| `429` | `RateLimitError` |
| `403` or `404` on submission, or `report()` finds the reporter unavailable | `AvailabilityError` |
| `419` expired session or CSRF token | `SessionExpiredError` |
| `413` request too large | `PayloadTooLargeError` |
| Request exceeded `timeoutMs` | `TimeoutError` |
| `5xx` | `ServerError` |
| Network failure (no `statusCode`) or another status | `TransportError` |

`SessionExpiredError`, `PayloadTooLargeError`, and `TimeoutError` extend `TransportError`. A `200` response with `duplicate: true` is a success.

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

The adapter exposes message, attachments, availability, submission state, the latest response, `lastError`, per-field `fieldErrors`, attachment helpers, and `submit()`. `available` is `null` until `init()` finishes the availability check. `submit()` records failures in the state instead of rethrowing, and keeps the same `clientReportId` for retries until a submission succeeds. Call `markEdited()` when the user changes the draft to clear the previous success state, and `destroy()` when the component is removed. `addAttachment()` defaults to the `attachment` source.

## Diagnostic context and privacy

At submission time, the SDK collects a bounded snapshot of:

- sanitized page URL, origin, pathname, title, and referrer;
- viewport, scroll position, screen, locale, timezone, and browser capabilities;
- network state and normalized performance data;
- the active element's tag, ID, and class names;
- application metadata and explicitly allowlisted storage values.

Query values and URL hashes are excluded by default. Query values can be included through an allowlist (`query.mode: 'allowlist'`), or all but listed keys can be kept (`query.mode: 'exclude'`); hashes require explicit opt-in. Browser storage values are not read unless exact keys are configured, and each value is truncated to 1 KB.

Continuous collectors are disabled by default, and a report includes only the collectors enabled by its own reporter or Widget:

| Option | Behavior when enabled |
| --- | --- |
| `errors` | Observes errors and unhandled rejections without replacing `window.onerror`; script URLs are sanitized |
| `console` | Wraps `console.error` and `console.warn`; keeps up to 10 arguments of 500 characters each |
| `network` | Wraps `fetch` and XMLHttpRequest and records failures |
| `breadcrumbs` | Records bounded click, submit, and navigation metadata |
| `performance` | Not a continuous collector: a one-time snapshot taken at submission, included unless set to `false` |

Global wrappers are reference-counted and are restored only while they remain the active wrapper. Call `destroyDiagnostics()` when disposing a headless reporter that enabled continuous collectors.

The SDK does not intentionally collect password values, cookies, authorization headers, CSRF token values, request or response bodies, or unrestricted storage. Review custom metadata and explicitly enabled diagnostics for personal or regulated data.

The server records the following independently of the client:

- columns: `user_id`, `ip_address`, and `user_agent` (truncated to 1024 characters);
- `metadata.server`: `received_at`, `ip_address`, `http_method`, `host`, `server_route` (the name of the ingestion route, not the page's route), `authenticated_user_id`, and, when enabled in `server_context`, `environment`, `laravel_version`, and `php_version`. A client-sent `server` key is overwritten.

`FeedbackReport` hides `ip_address` and `user_agent` when it is serialized to an array or JSON.

## Storage and application integration

Reports and attachments use ULID primary keys. Attachment files are written to:

```text
{storage.path}/{YYYY}/{MM}/{DD}/{report ULID}/{attachment ULID}.{extension}
```

The default disk is `local`, and files are written with private visibility. Keep uploads private and expose previews or downloads only through application routes protected by a Gate or policy. SVG is excluded by default. The server validates the real image MIME type, per-file size, file count, total size, pixel count (`attachments.max_pixels`), an `http`/`https` page URL, viewport and screen ranges, the timezone, metadata byte size, and metadata nesting depth. Every validation failure, including invalid metadata, returns 422 before any file is written.

Files are written before the database transaction. If a write or the transaction fails, the written files and the report directory are removed. `FeedbackStored` is dispatched only after the transaction commits, including when the action runs inside an outer transaction, and outside that cleanup, so a failing listener cannot remove the files of a stored report.

`client_report_id` is an idempotency key. A repeated key from the same submitter (the same authenticated user, or for guests the same IP address) returns the existing report with `200` and `"duplicate": true`, without storing files or dispatching the event again. This also holds for concurrent duplicates. A key already used by another submitter is rejected with 422.

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

### Deletion and retention

Deleting a `FeedbackReport` or `FeedbackAttachment` through Eloquent also deletes the stored files. Database cascades and query-builder deletes bypass model events and leave files behind, so delete through the models.

Set `retention.days` to delete older reports and their files with Laravel's `model:prune`. Retention is disabled when the value is `null`. The model lives in the package, so pass it explicitly when scheduling:

```php
// routes/console.php
use Illuminate\Support\Facades\Schedule;
use TrustMedical\FeedbackReporter\Models\FeedbackReport;

Schedule::command('model:prune', ['--model' => [FeedbackReport::class]])->daily();
```

## Configuration reference

The published `config/feedback-reporter.php` groups settings under:

- `enabled`: master switch;
- `availability`: environments, authentication, IP rules, Gate, policy, and denial status;
- `route`: registration, prefix, name prefix, domain, middleware, and paths;
- `rate_limit`: maximum attempts and decay interval for submissions and availability checks;
- `storage`: private disk and base path;
- `attachments`: count, size, total size, allowed MIME types, and maximum pixels;
- `metadata`: maximum encoded bytes and nesting depth;
- `server_context`: environment, Laravel version, and PHP version switches;
- `retention`: days to keep reports before `model:prune` deletes them.

The configuration file reads these environment variables:

| Variable | Config key | Default |
| --- | --- | --- |
| `FEEDBACK_REPORTER_ENABLED` | `enabled` | `false` |
| `FEEDBACK_REPORTER_REGISTER_ROUTES` | `route.register` | `true` |
| `FEEDBACK_REPORTER_ROUTE_PREFIX` | `route.prefix` | `feedback-reporter` |
| `FEEDBACK_REPORTER_ROUTE_AS` | `route.as` | `feedback-reporter.` |
| `FEEDBACK_REPORTER_ROUTE_DOMAIN` | `route.domain` | `null` |
| `FEEDBACK_REPORTER_ROUTE_PATH_AVAILABILITY` | `route.paths.availability` | `availability` |
| `FEEDBACK_REPORTER_ROUTE_PATH_STORE` | `route.paths.store` | `reports` |
| `FEEDBACK_REPORTER_DISK` | `storage.disk` | `local` |

Application code should use `config()` so Laravel configuration caching continues to work. When a published configuration omits a key, the package falls back to the restrictive default, for example `local` and `staging` for `availability.environments`.

## Development and security

The development tools run in Docker:

```bash
make test       # Pest and Vitest
make analyse    # PHPStan and TypeScript
make lint       # Pint (--test) and Biome
make audit      # composer audit and npm audit
make build-js   # rebuild dist/
make serve      # Workbench at http://localhost:8000
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the Docker and Workbench workflow, [CHANGELOG.md](CHANGELOG.md) for release history, and [SECURITY.md](SECURITY.md) for vulnerability reporting.
