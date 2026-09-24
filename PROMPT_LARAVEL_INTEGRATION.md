# Laravel Feedback Reporter v4.1 integration prompt

Copy the prompt below into an AI coding assistant or use it as an implementation checklist.

```markdown
# Integrate Laravel Feedback Reporter v4.1

Integrate `trust-medical/laravel-feedback-reporter:^4.1` and `@trust-medical/feedback-reporter@^4.1` into this Laravel application. Version 4 is message-first: users take screenshots on their computer or phone and upload them. Images are optional. Do not implement DOM screenshot capture or restore pre-v4 capture behavior.

## Inspect the application first

Before editing, verify:

- PHP 8.3+ with fileinfo, json, mbstring, and PDO
- Laravel 12 or 13 and Composer 2
- a database that supports CHAR(26) ULIDs and JSON
- Node.js 20+ when bundling the Widget or headless SDK
- the installed package versions and the application's local conventions

Inspect where shared Blade components and Vite entries live, which public and administration layouts need the reporter, and which guards, roles, Gates, or policies protect support data. Determine whether guests may report feedback and from which environments or networks. Check the private storage disk, trusted proxies, queue, notifications, administration framework, and test stack.

If a prerequisite is missing, report it before installing dependencies. Prefer the official Widget unless a custom UI is explicitly required. Do not maintain a second application-owned image editor beside the Widget.

## Install the backend

1. Install the package, publish its config, and migrate:

   ```bash
   composer require trust-medical/laravel-feedback-reporter:^4.1
   php artisan vendor:publish --tag=feedback-reporter-config
   php artisan migrate
   ```

   Package migrations load automatically. Publish `feedback-reporter-migrations` before migrating only when the application intentionally owns migration copies.
2. Enable the package through config and environment variables. Read environment values only from config files.
3. Review environments, authentication, user/IP allowlists and denylists, the custom availability policy, unavailable response, route middleware, rate limit, validation limits, and storage. Keep attachments on a private disk.
4. Keep the package's availability and submission routes unless application-specific route options are necessary. Custom routes must preserve availability middleware, CSRF protection, authentication/authorization, and rate limiting.

The built-in availability conditions are combined with AND. If the business rule is an OR expression such as “authenticated user OR approved guest IP/CIDR,” implement `TrustMedical\FeedbackReporter\Contracts\FeedbackAvailability` rather than weakening the submission route. Verify Laravel trusted proxies before relying on client IP or CIDR checks; do not trust forwarded headers without correct proxy configuration.

Enforce availability in three layers:

1. conditionally render the Blade component for a clean UX;
2. let the Widget call the availability endpoint before opening;
3. require the package's server-side availability middleware on submission.

The third layer is the security boundary. Client-side hiding never replaces server authorization.

## Add the official Widget

Install the frontend package:

```bash
npm install @trust-medical/feedback-reporter@^4.1
```

Create one small Vite entry that only registers the custom element:

```ts
import { registerFeedbackReporterElement } from '@trust-medical/feedback-reporter/widget'

registerFeedbackReporterElement()
```

Registration is explicit and idempotent. The Widget is a separate entry so headless consumers do not load Konva or Widget code.

Wrap the element in one reusable Blade component so endpoints, locale, availability, and asset loading remain consistent:

```blade
@props(['sourceType' => 'web_site', 'panelId' => null, 'routeName' => null])

@if (app(\TrustMedical\FeedbackReporter\FeedbackReporter::class)->available(request()))
    <trust-feedback-reporter
        endpoint="{{ route('feedback-reporter.store') }}"
        availability-endpoint="{{ route('feedback-reporter.availability') }}"
        source-type="{{ $sourceType }}"
        lang="{{ app()->getLocale() }}"
        color-scheme="auto"
        @if ($panelId) panel-id="{{ $panelId }}" @endif
        @if ($routeName) route-name="{{ $routeName }}" @endif
    ></trust-feedback-reporter>

    @once
        @vite('resources/js/feedback-reporter.ts')
    @endonce
@endif
```

Adapt asset loading to the target application's conventions and load the entry only once. Use `source-type="web_site"` plus the current named route on public pages. Use `source-type="admin_panel"`, the panel identifier, and the current named route in an administration panel.

For Filament, render this same Blade component from a panel render hook such as `PanelsRenderHook::BODY_END`. Do not build a separate Filament reporter. Use the equivalent layout hook for another administration framework.

Set the element's `config` property before it connects when programmatic options are necessary. Do not add host Tailwind utilities, global Widget CSS, or a direct Konva dependency. The Widget bundles its editor and CSS in an open Shadow DOM. Application code must not query or mutate its internal DOM.

Shadow DOM prevents accidental CSS and selector conflicts; it is not a security boundary against malicious same-page JavaScript. The Widget owns its listeners, Konva instances, and object URLs and cleans them up when disconnected.

## Use headless mode only when required

For an explicitly custom UI, use `createFeedbackReporter()` or the Alpine adapter. The message is required and images are optional. Submit user-created PNG, JPEG, or WebP files with source `user_screenshot` or `attachment`. Keep availability handling, validation feedback, and retries accessible. Do not load the Widget entry in a headless-only integration.

## Diagnostics and privacy

Keep the Widget defaults unless requirements say otherwise. Continuous console, fetch, XHR, and breadcrumb monitoring stays disabled unless explicitly approved. If enabled, document privacy and global-wrapper implications. Error monitoring uses a non-cancelling event listener.

Never collect passwords, cookies, authorization headers, CSRF tokens, request/response bodies, or unrestricted browser storage. Avoid personal data in custom metadata. Query strings and URL fragments may contain sensitive data; retain the privacy-preserving defaults unless a reviewed requirement says otherwise.

Treat diagnostic context as untrusted support data. Escape it in HTML. Do not expose raw arbitrary metadata in the administration UI by default; show only fields reviewers need.

## Add reviewer access safely

The administration UI is application-owned. If required, build a read-only list/detail workflow using the existing framework and conventions. Do not add create, edit, or delete actions unless requested. A useful implementation normally includes report time, ULID, source, user, message, page title/URL, attachment count, source/date filters, selected diagnostics, and an attachment gallery. Avoid N+1 queries with eager loading or aggregate counts.

Keep images outside the public web root. Protect preview/download routes with authentication and an application Gate or policy. Apply the same authorization to the administration resource. Authentication alone is insufficient: an authenticated non-reviewer must still be denied.

Use route model binding, verify that the storage object exists, and return 404 when it does not. Stream through Laravel's filesystem response APIs with the stored MIME type and `Cache-Control: private, no-store`. Do not expose attachments through a public storage symlink.

Listen for `TrustMedical\FeedbackReporter\Events\FeedbackStored` when the application needs notifications or workflows. The stored report is `$event->feedback`. Queue slow work and do not notify before persistence succeeds.

## Clean up an older integration

When replacing a pre-v4 integration, remove `html-to-image`, `html2canvas-pro`, capture APIs/config/callbacks, automatic-capture UI, CORS image filters, capture retry warnings, capture-only stylesheet `crossorigin` settings, and `data-feedback-ignore` / `data-feedback-redact` conventions. Do not add CORS workarounds for manually uploaded images.

The v4 migration converts existing `automatic_capture` source rows to `user_screenshot`. Historical JSON metadata remains historical data.

## Test the integration

Follow the application's Pest/PHPUnit and browser-test conventions. Use factories and storage, event, and notification fakes where appropriate.

Feature coverage must include:

- each applicable availability branch: guests, authenticated users, denied users, exact IPs/CIDRs, and disabled environments;
- conditional Widget presence for UX and direct POST denial as the security boundary;
- successful message-only and multipart image submissions;
- required message, invalid MIME, per-file/count/total limits, rate limiting, and duplicate client report IDs;
- response, database state, attachment storage, event dispatch, and cleanup after a failed multi-file submission;
- reviewer and non-reviewer access to the report resource;
- authorized preview/download, denied access, and a missing storage object;
- escaped report and diagnostic output.

Use browser tests only for behavior PHP feature tests cannot prove: registration, Shadow Root rendering, upload, attachment removal, annotations, move and hand tools, zoom, fit, GUI undo/delete, image switching, success confirmation and automatic close, mobile wrapping/scrolling, and operation on normal and administration pages. Add strong host CSS and same-named data attributes to verify isolation in both directions. Wait for observable UI state instead of fixed sleeps and assert that no JavaScript errors occurred.

## Acceptance checks

- A message can be sent without an image, and one or more manual screenshots can be removed, annotated, panned, and sent.
- Availability and reviewer authorization match the agreed auth, environment, network, Gate, or policy rules.
- Private attachments cannot be accessed without authorization.
- The Widget works on all requested layouts without host/Widget style leakage.
- Mobile controls wrap and the editor scrolls.
- No automatic-capture dependency, code, copy, or CORS workaround remains.
- Applicable PHP tests, static analysis, formatting, frontend tests, typecheck, production build, and Composer/npm audits pass.

Run only commands available in the target repository and do not claim checks that were not executed. When complete, summarize changed files, availability and authorization choices, private-file delivery, privacy decisions, and verification results.
```
