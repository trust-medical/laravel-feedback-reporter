# Laravel Feedback Reporter v4 integration prompt

Copy the prompt below into an AI coding assistant or use it as an implementation checklist.

```markdown
# Integrate Laravel Feedback Reporter v4

Integrate `trust-medical/laravel-feedback-reporter` into this Laravel application. The v4 workflow is message-first: users take screenshots with their computer or phone and upload them. Do not implement DOM screenshot capture.

## Verify first

Before editing, verify:

- PHP 8.3+, with fileinfo, json, mbstring, and PDO
- Laravel 12 or 13
- Composer 2
- A database supporting CHAR(26) ULIDs and JSON
- Node.js 20+ when bundling the official Widget or headless SDK
- The existing authentication, frontend, admin panel, storage, authorization, and test conventions

If a prerequisite is missing, report it before installing dependencies.

## Backend

1. Install `trust-medical/laravel-feedback-reporter`.
2. Publish config and migrations, then migrate.
3. Enable the package and configure availability restrictions. Preserve authentication and authorization requirements; use a private attachment disk.
4. Keep the package routes or register equivalent routes with project middleware.
5. Add authorized preview/download endpoints for private attachments when the project needs them.
6. Listen for `TrustMedical\FeedbackReporter\Events\FeedbackStored` and queue any project-specific notification after commit.
7. If an administration UI exists, add a read-only report list/detail view that follows its conventions.

## Frontend

Install:

```bash
npm install @trust-medical/feedback-reporter
```

Prefer the official isolated Widget:

```ts
import { registerFeedbackReporterElement } from '@trust-medical/feedback-reporter/widget'

registerFeedbackReporterElement()
```

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

Place it in the shared public and/or admin layout requested by the application. For programmatic configuration, set the element's `config` property before connecting it. Do not add Tailwind or host CSS for the Widget: it ships its own styles in an open Shadow DOM.

The Shadow DOM protects against accidental style and selector conflicts. It is not a security boundary against malicious same-page JavaScript.

If a custom UI is required, use `createFeedbackReporter()` or the Alpine adapter. The message is required and images are optional. Submit user-created PNG, JPEG, or WebP files with source `user_screenshot` or `attachment`.

## Diagnostics and privacy

Use the Widget defaults unless requirements say otherwise. Continuous console, fetch, XHR, and breadcrumb monitoring must remain disabled unless explicitly approved. If enabled, document the privacy and global-wrapper implications. Error monitoring uses a non-cancelling event listener.

Never collect passwords, cookies, authorization headers, CSRF tokens, request/response bodies, or unrestricted browser storage. Avoid placing personal data in custom metadata.

## Acceptance checks

- Availability correctly follows auth/environment/policy settings.
- A message can be submitted without an image.
- One or more manually created screenshots can be uploaded and submitted.
- Zoom, fit, rectangle, arrow, undo, delete, and image switching work.
- The Widget works in normal pages and the admin panel.
- Host CSS cannot restyle internal controls and Widget CSS does not leak out.
- Mobile controls wrap and the image editor scrolls.
- No automatic screenshot dependency, code, UI copy, or CORS workaround remains.
- Private attachments require authorization to view.
- PHP tests, PHPStan, Pint, frontend tests, formatting, typecheck, production build, and dependency audits pass.

Summarize changed files, security choices, and verification results when complete.
```
