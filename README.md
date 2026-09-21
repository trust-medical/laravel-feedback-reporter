# Laravel Headless Feedback Reporter

[English](README.md) | [日本語](README.ja.md)

A production-ready, headless feedback and technical diagnostic reporter package for **Laravel 12 and 13** (PHP 8.3+).

[![Tests & Code Quality](https://github.com/trust-medical/laravel-feedback-reporter/actions/workflows/tests.yml/badge.svg)](https://github.com/trust-medical/laravel-feedback-reporter/actions/workflows/tests.yml)
[![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg)](LICENSE)

---

## 1. Important Design Principles & Explicit Non-Goals

> [!IMPORTANT]
> **The package provides NO feedback UI.**
> There are no built-in buttons, modals, forms, or toasts. Your frontend application builds its own UI and invokes the TypeScript SDK.
>
> **The package sends NO notifications directly.**
> There is no built-in Slack, Discord, Teams, Email, Webhook, or GitHub Issues integration. When a feedback report is safely persisted, a Laravel Event (`TrustMedical\FeedbackReporter\Events\FeedbackStored`) is dispatched. Your application subscribes to this event to trigger any notification, job, or queue.
>
> **Automatic screenshot is NOT a prerequisite.**
> While `html-to-image` is used for DOM screenshots, DOM complexity or CORS may cause automatic capture to fail. The reporter defaults to `captureFailure: 'continue'`, allowing feedback to be submitted successfully with user-supplied screenshots or messages.
>
> **Strict Privacy by Default.**
> The package NEVER captures passwords (`input[type=password]`), cookie values, authorization headers, CSRF tokens, request/response bodies, or full localStorage/sessionStorage.

---

## 2. Requirements

* **PHP**: 8.3+
* **Laravel**: 12.x or 13.x
* **Composer**: 2.x
* **Node.js**: 20+ (for Frontend TypeScript SDK)

---

## 3. Installation

### 3.1 Install Composer Package

```bash
composer require trust-medical/laravel-feedback-reporter
```

### 3.2 Publish Configuration & Migrations

```bash
# Publish config
php artisan vendor:publish --tag=feedback-reporter-config

# Publish migrations (optional, or run directly)
php artisan vendor:publish --tag=feedback-reporter-migrations

# Run migrations
php artisan migrate
```

### 3.3 Install Frontend TypeScript SDK

```bash
npm install @trustmedical/feedback-reporter html-to-image
```

---

## 4. Configuration

The configuration file is located at `config/feedback-reporter.php`.

```php
return [
    // Master switch
    'enabled' => (bool) env('FEEDBACK_REPORTER_ENABLED', false),

    // Multi-dimensional Availability (all conditions evaluated with AND logic)
    'availability' => [
        'environments' => ['local', 'staging'],
        'require_authentication' => true,
        'allowed_ips' => [], // Single IP or CIDR block (IPv4/IPv6)
        'denied_ips' => [],  // Evaluated before allowed_ips
        'gate' => null,      // Optional Laravel Gate ability
        'policy' => null,    // Class implementing FeedbackAvailability
        'disabled_response' => 404, // Status code when rejected (404 or 403)
    ],

    // Route settings (configurable to avoid conflicts with host application routes)
    'route' => [
        'register' => (bool) env('FEEDBACK_REPORTER_REGISTER_ROUTES', true),
        'prefix' => env('FEEDBACK_REPORTER_ROUTE_PREFIX', 'feedback-reporter'),
        'as' => env('FEEDBACK_REPORTER_ROUTE_AS', 'feedback-reporter.'),
        'domain' => env('FEEDBACK_REPORTER_ROUTE_DOMAIN', null),
        'middleware' => ['web'],
        'paths' => [
            'availability' => env('FEEDBACK_REPORTER_ROUTE_PATH_AVAILABILITY', 'availability'),
            'store' => env('FEEDBACK_REPORTER_ROUTE_PATH_STORE', 'reports'),
        ],
    ],

    // Rate limiting
    'rate_limit' => [
        'max_attempts' => 10,
        'decay_minutes' => 1,
    ],

    // Storage disk and base path (Private disk recommended)
    'storage' => [
        'disk' => env('FEEDBACK_REPORTER_DISK', 'local'),
        'path' => 'feedback-reports',
    ],

    // Attachment limits
    'attachments' => [
        'max_files' => 5,
        'max_file_size_kb' => 5120,    // 5MB per file
        'max_total_size_kb' => 20480,  // 20MB total per feedback
        'allowed_mimes' => [
            'image/png',
            'image/jpeg',
            'image/webp',
            // Note: SVG is intentionally excluded for XSS security
        ],
    ],

    // Metadata constraints
    'metadata' => [
        'max_bytes' => 262144, // 256 KB
        'max_depth' => 10,
    ],
];
```

### 4.1 Avoiding Route Conflicts & Manual Routing

By default, the package registers the following routes:
- `GET /feedback-reporter/availability` (route name: `feedback-reporter.availability`)
- `POST /feedback-reporter/reports` (route name: `feedback-reporter.store`)

If these conflict with routes or naming schemes in your application, you can customize or opt out of automatic registration.

#### A. Customizing Prefix, Names, and Sub-paths
You can customize the route configuration via environment variables or `config/feedback-reporter.php`:
```env
# Change URL prefix (e.g. /support/feedback)
FEEDBACK_REPORTER_ROUTE_PREFIX="support/feedback"

# Change route name prefix
FEEDBACK_REPORTER_ROUTE_AS="support.feedback."

# Change individual sub-paths (e.g. /reports -> /submissions)
FEEDBACK_REPORTER_ROUTE_PATH_STORE="submissions"
FEEDBACK_REPORTER_ROUTE_PATH_AVAILABILITY="status"
```

#### B. Disabling Auto-Registration & Manual Routing (ignoreRoutes)
Similar to Laravel standard packages (e.g. Sanctum, Horizon), you can prevent the service provider from automatically registering routes:

1. In your `AppServiceProvider`:
```php
use TrustMedical\FeedbackReporter\FeedbackReporter;

public function register(): void
{
    FeedbackReporter::ignoreRoutes();
}
```
*(Or set `FEEDBACK_REPORTER_REGISTER_ROUTES=false` in your `.env`)*

2. In your `routes/web.php` or `routes/api.php`:
```php
use TrustMedical\FeedbackReporter\FeedbackReporter;

// Register with default or custom options
FeedbackReporter::routes(options: [
    'prefix' => 'helpdesk/feedback',
    'as' => 'helpdesk.feedback.',
    'middleware' => ['web', 'auth'],
]);
```

#### C. Connecting Frontend SDK via Blade
Even when routes are customized, using Laravel route helpers in your Blade layout automatically resolves the exact endpoints:
```blade
<script>
    window.feedbackReporterConfig = {
        endpoint: '{{ route('feedback-reporter.store') }}',
        availabilityEndpoint: '{{ route('feedback-reporter.availability') }}',
    };
</script>
```

---

## 5. Frontend SDK Usage

### 5.1 Basic Usage (Vanilla JS / Modern Frameworks)

```ts
import { createFeedbackReporter } from '@trustmedical/feedback-reporter'

const reporter = createFeedbackReporter({
    endpoint: '/feedback-reporter/reports',
    availabilityEndpoint: '/feedback-reporter/availability',
})

// 1. One-shot Report (Availability check -> Capture -> Context collection -> Submit)
await reporter.report({
    message: 'Save button is unresponsive on checkout page.',
})
```

### 5.2 User Screenshots & Multiple Attachments

```ts
// Attach a manual screenshot (File from input or paste) and additional images
const fileInput = document.querySelector<HTMLInputElement>('#file-picker')
const userFile = fileInput?.files?.[0]

await reporter.report({
    message: 'Alignment issue on profile settings.',
    attachments: [
        ...(userFile ? [{ file: userFile, source: 'user_screenshot' as const }] : []),
    ],
})
```

### 5.3 Redaction and Capture Exclusion

Exclude elements from the automated screenshot using `data-feedback-ignore`:

```html
<div data-feedback-ignore>
    <!-- This block and its children will NOT appear in screenshots -->
</div>
```

Mask sensitive text or form fields temporarily during capture using `data-feedback-redact`:

```html
<p data-feedback-redact>
    User Credit Card: 4111-2222-3333-4444
    <!-- Automatically masked with ████████ during capture, then restored in finally block -->
</p>
```

> [!NOTE]
> Sensitive fields like `input[type=password]` are automatically excluded by default.

### 5.4 Alpine.js Integration

```html
<div x-data="createAlpineFeedbackReporter()">
    <template x-if="available">
        <div>
            <textarea x-model="message" placeholder="Describe the issue..."></textarea>
            
            <input type="file" @change="addAttachment($event.target.files[0], 'user_screenshot')">

            <button @click="submit" :disabled="isSubmitting">
                <span x-show="!isSubmitting">Submit Feedback</span>
                <span x-show="isSubmitting">Submitting...</span>
            </button>

            <p x-show="isSuccess" class="text-green-600">Feedback sent successfully!</p>
            <p x-show="errorMessage" x-text="errorMessage" class="text-red-600"></p>
        </div>
    </template>
</div>

<script type="module">
    import { createAlpineFeedbackReporter } from '@trustmedical/feedback-reporter/alpine'
    window.createAlpineFeedbackReporter = createAlpineFeedbackReporter
</script>
```

---

## 6. Listening for Feedback & Sending Notifications

When a report is stored, `TrustMedical\FeedbackReporter\Events\FeedbackStored` is dispatched.

Register a listener in your application's `EventServiceProvider` or listener attribute:

```php
namespace App\Listeners;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Http;
use TrustMedical\FeedbackReporter\Events\FeedbackStored;

class NotifyDevTeam implements ShouldQueue
{
    public function handle(FeedbackStored $event): void
    {
        $report = $event->feedback;
        $attachmentCount = $report->attachments->count();

        // Example: Send notification to Slack
        Http::post(config('services.slack.webhook_url'), [
            'text' => sprintf(
                "🚨 New Feedback Report [%s]\nURL: %s\nMessage: %s\nAttachments: %d",
                $report->id,
                $report->page_url,
                $report->message,
                $attachmentCount,
            ),
        ]);
    }
}
```

---

## 7. Storage Integrity & All-or-Nothing Guarantee

1. Attachment files are stored on the configured disk (`feedback-reports/YYYY/MM/DD/<report-id>/<attachment-id>.<ext>`).
2. Image dimensions (`width`, `height`) are safely read with minimal memory overhead.
3. Database records are inserted within a transaction.
4. If a database error or unexpected failure occurs during the process, all newly stored files on the filesystem are automatically cleaned up (**Orphan Cleanup**).
5. `FeedbackStored` is dispatched **only after** successful transaction commit.

---

## 8. Docker Development

All development and testing can be executed directly inside Docker:

```bash
# Build environment
make build

# Install Composer and npm dependencies
make install

# Run Pest test suite
make test-php

# Run Vitest frontend test suite
make test-js

# Run static analysis (PHPStan Level 8 + TypeScript typecheck)
make analyse

# Code styling check (Laravel Pint)
make lint

# Auto-format
make format

# Build frontend SDK
make build-js
```

---

## 9. Security & Privacy Safeguards

* **No Credential Harvesting**: Passwords, cookies, Authorization headers, and form inputs are never collected.
* **Storage Isolation**: Attachments are stored on private disks with randomized ULID filenames, preventing directory traversal and public file guessing.
* **MIME Verification**: File inspection via finfo/PHP guarantees actual image content. SVGs are rejected to prevent stored XSS attacks.
* **Server Authority**: Client submissions cannot overwrite `ip_address`, `user_id`, or environment details; these are always enforced server-side.
* **URL Sanitization**: Query strings and hashes are stripped by default to prevent secret leaks in URLs.
* **Rate Limiting**: Built-in per-user and per-IP rate limiting (`feedback-reporter`, 10/min default).

---

## License

This package is open-sourced software licensed under the [MIT license](LICENSE).
