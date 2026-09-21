# Laravel Headless Feedback Reporter Universal Integration Prompt

This markdown file serves as an **integration request prompt for AI coding assistants (such as Cursor, Antigravity, Claude Code, GitHub Copilot, etc.) or software engineers** to integrate **`trust-medical/laravel-feedback-reporter`** into an existing Laravel application.

Copy the prompt block below and provide it to the AI agent in your target Laravel project.

---

```markdown
# Instruction: Integration of Laravel Headless Feedback Reporter

## Objective
Integrate the production-ready bug reporting and diagnostic context collection package **`trust-medical/laravel-feedback-reporter`** into this Laravel project.
Before starting implementation, **first verify that this project satisfies the package prerequisites**. After confirming compatibility, complete the integration across the public website and admin panels (whether using Filament or a custom admin dashboard).

---

## Step 0: [Highest Priority] Prerequisite Verification

**Before making any code modifications or running installation commands, strictly verify the following prerequisites first.**
If any prerequisite is not met, do NOT proceed with source code modifications or installations; immediately report the missing prerequisites and recommended upgrade path to the user for instructions.

### 1. PHP Version and Required Extensions
- **Verification**: Run `php -v` and `php -m`
- **Requirements**:
  - **PHP 8.2 or higher** (*For Laravel 13 environments, **PHP 8.3 or higher** is strictly required*)
  - Required PHP extensions: `fileinfo` (mandatory for binary verification of attachment MIME types), `json`, `mbstring`, `pdo`

### 2. Laravel Framework Version
- **Verification**: Run `php artisan --version` or inspect `laravel/framework` in `composer.json`
- **Requirements**:
  - **Laravel 12.x or 13.x**
  - *Note: Laravel 10.x / 11.x does not meet the package dependency (`^12.0 || ^13.0`); an upgrade plan for Laravel itself is required.*

### 3. Composer Version
- **Verification**: Run `composer --version`
- **Requirements**: **Composer 2.x or higher**

### 4. Node.js and Frontend Environment
- **Verification**: Run `node -v`
- **Requirements**:
  - **Node.js is only required when bundling the SDK with Vite or package managers (npm, pnpm, yarn, bun)** (Node.js 20+).
  - **If Node.js is unavailable**: Integration is fully supported without Node.js using Vanilla JS / CDN / standard HTML forms (select this approach in Step 4).

### 5. Database Requirements
- **Verification**: Check `DB_CONNECTION` in `.env` and database version
- **Requirements**:
  - Must support ULID (CHAR(26)) primary keys and JSON columns (`metadata`) (e.g., MySQL 8.0+, PostgreSQL 12+, SQLite 3.35+).

### 6. Identify Existing Project Stack (Branching Strategy)
Once prerequisites are confirmed, identify the following stack details to determine the implementation strategy:
- **Admin Panel**: Is `filament/filament` installed? (→ Select Step 5-A or 5-B)
- **Frontend Environment**: Is there a Node.js / Vite build setup (npm, pnpm, yarn, bun), or no Node.js (Vanilla JS / CDN / standard HTML forms)?
- **Frontend Stack**: Blade + Alpine.js / Tailwind CSS, or Inertia.js (Vue / React)? (→ Select appropriate approach in Step 4)
- **Auth Guards**: Default `web` guard, Filament-specific guard, or multi-guard configuration.

---

## 1. Package Specifications and Core Principles
- **Package Name**: `trust-medical/laravel-feedback-reporter`
- **Frontend SDK**: `@trustmedical/feedback-reporter` + `html-to-image`
- **Core Architecture**:
  - **Headless Design**: The package provides no frontend UI or external notification dispatchers. It focuses strictly on APIs, data persistence, atomic transactions, orphaned file cleanup, and event dispatching.
  - **Privacy by Default**: Password fields (`input[type=password]`), cookies, Authorization headers, and CSRF tokens are never collected. DOM masking (`data-feedback-redact`) and capture omission (`data-feedback-ignore`) are strictly respected.
  - **Private Storage**: Attachments are stored on a private disk (`local`, etc.) with non-guessable ULID paths. Viewing attachments requires authorized streaming endpoints.
  - **Event-Driven**: Dispatches `TrustMedical\FeedbackReporter\Events\FeedbackStored` after the transaction commits successfully.

---

## 2. Common Backend Setup (All Projects)

### Step 1: Package Installation and Configuration
1. **Add Composer Dependency**:
   - Run `composer require trust-medical/laravel-feedback-reporter`
   - *If using a local or private repository, configure `repositories` in `composer.json` accordingly.*
2. **Publish Configuration and Migrations**:
   - `php artisan vendor:publish --tag=feedback-reporter-config`
   - `php artisan vendor:publish --tag=feedback-reporter-migrations`
   - Run `php artisan migrate`
3. **Configure Environment Variables and Settings (`config/feedback-reporter.php`, `.env`)**:
   - `.env` example:
     ```env
     FEEDBACK_REPORTER_ENABLED=true
     FEEDBACK_REPORTER_DISK=local
     FEEDBACK_REPORTER_ROUTE_PREFIX=feedback-reporter
     ```
   - Adjust `availability` in `config/feedback-reporter.php` according to project requirements (auth requirement, environment restrictions, etc.).

### Step 2: Secure Streaming Controller for Private Attachments
Because attachments reside on a private disk (`storage/app/feedback-reports/...`), create an authorized streaming endpoint so administrators can safely preview and download images.

1. **Create Controller** (e.g., `App\Http\Controllers\Admin\FeedbackAttachmentController`):
   - Route: `GET /admin/feedback-attachments/{attachment}/preview` (Route name: `admin.feedback-attachments.preview`)
   - Route: `GET /admin/feedback-attachments/{attachment}/download` (Route name: `admin.feedback-attachments.download`)
   - Requirements:
     - Verify authorization (admin permission, gate, or policy).
     - Bind `TrustMedical\FeedbackReporter\Models\FeedbackAttachment`.
     - Return `Storage::disk($attachment->disk)->response($attachment->path)` or `download(...)`.
     - Set appropriate MIME types and `Cache-Control: private, no-cache` headers.

### Step 3: Feedback Notification Listener
Create an event listener that subscribes to `FeedbackStored` to notify the development team.

1. **Create Listener** (e.g., `App\Listeners\SendFeedbackNotification`):
   - Target Event: `TrustMedical\FeedbackReporter\Events\FeedbackStored`
   - Implement `ShouldQueue` for asynchronous processing.
   - Logic:
     - Determine the report source (public site vs admin panel) and reflect it in the notification subject/title.
     - Include a direct link to the report detail view in the admin panel if an admin interface exists.
     - Dispatch notification via Slack Webhook, Discord, Teams, Email, Database Notification, etc.

---

## 3. Frontend: Feedback Reporting UI (Public Site & Admin Panels)

### Step 4: Build the Feedback Reporting UI
Select and implement one of the following approaches based on the project's frontend environment:

1. **Approach A: With Node.js & Build Tools (Vite, etc.)**:
   - Run `npm install @trustmedical/feedback-reporter html-to-image` (or `pnpm add`, `yarn add`, `bun add` depending on the project's package manager).
   - **Blade + Alpine.js**: Use `createAlpineFeedbackReporter` from `@trustmedical/feedback-reporter/alpine`.
   - **Inertia.js (Vue / React)**: Use `createFeedbackReporter()` to build a reactive modal component.
2. **Approach B: Without Node.js (Vanilla JS / CDN / Standard HTML Forms)**:
   - **Vanilla JS / Fetch API**: Load `html-to-image` via CDN if needed, and submit to `/feedback-reporter/reports` using native `fetch()` with `FormData`.
   - **Alpine.js (CDN)**: Build a modal using `<script src="//unpkg.com/alpinejs">` and CDN-hosted `html-to-image`.
   - **Standard HTML Forms**: Implement a Blade form submitting via `<form method="POST" action="/feedback-reporter/reports" enctype="multipart/form-data">`.

3. **Functional Requirements (Common)**:
   - Availability check (toggle UI display based on `reporter.isAvailable()` or GET `/feedback-reporter/availability`).
   - Message textarea (required).
   - User screenshot/image attachment input (optional).
   - Submit button with loading state during DOM capture/upload and double-submission prevention.
   - Success and error handling displays.
4. **Targeting Admin Panel Pages for Feedback**:
   - Embed the widget into common admin layouts (Blade master layout or Filament layout).
   - On submission, inject page context into `metadata` (`source_type`: `admin_panel` or `web_site`, page title, authenticated user details, etc.).
5. **Masking and Ignoring Sensitive Data**:
   - Apply `data-feedback-ignore` to the feedback modal itself so it does not capture itself.
   - Apply `data-feedback-redact` to sensitive elements (customer PII, payment info, secret credentials).

---

## 4. Admin Management Interface (Branching Strategy)

### 5-A. [When Using Filament]
If the project uses Filament:

1. **In-Admin Feedback Submission**:
   - Inject the feedback widget into Filament using `PanelsRenderHook::BODY_END` or `USER_MENU_BEFORE`.
   - Automatically inject Filament context into `metadata` (`panel_id`, `resource`, `page_class`, `record_id`, etc.).
   - Configure data redaction on form fields (`->extraInputAttributes(['data-feedback-redact' => true])`) and table cells (`->extraCellAttributes(['data-feedback-redact' => true])`).
2. **Create Filament Resource (`FeedbackReportResource`)**:
   - Run `php artisan make:filament-resource FeedbackReport --view`
   - **Table View**: Badge for report source (`Public Site` vs `Filament Admin`), date, report ID, user, page title, attachment count.
   - **View Infolist**:
     - Message, page URL, and a direct action button to jump to the originating admin page.
     - Diagnostic technical details (User Agent, viewport/screen dimensions, locale, timezone, metadata JSON viewer).
     - Attachment gallery with secure image previews and download actions using Step 2 endpoints.

---

### 5-B. [When NOT Using Filament (Pure Laravel / Custom Admin)]
If the project does not use Filament, choose one of the following based on project requirements:

1. **Option 1: Integrate into Existing Custom Admin Panel**:
   - **Create Controller** (e.g., `App\Http\Controllers\Admin\FeedbackReportController`):
     - `index`: Paginated list with source/date filters and search.
     - `show`: Detailed report view (message, diagnostics, formatted metadata JSON, attachments).
   - **Create Views** (Blade or Inertia):
     - Inherit existing admin layout (e.g., `layouts/admin.blade.php`).
     - Display links to source URLs, secure attachment previews, and download links via Step 2 endpoints.
   - **Embed Widget in Admin Layout**:
     - Place the Step 4 widget in `layouts/admin.blade.php` footer so operators/admins can report issues encountered inside the admin panel.
2. **Option 2: Minimal Standalone Admin Dashboard (No Pre-existing Admin Panel)**:
   - Create a dedicated route (`/admin/feedback-reports`) protected by admin authorization (`admin` middleware or `can:view-reports`) with a clean Blade template.
   - Build a minimal single-page dashboard using Tailwind CSS or project styles to review submissions and attachments.
3. **Option 3: Notification-Centric Workflow (UI-less Management)**:
   - Do not build an admin UI; rely entirely on rich notifications from Step 3 (Slack, Discord, Email) containing diagnostic context and attachment links.

---

## 5. Acceptance and Verification Scenarios
After completing implementation, verify the following:

1. **Availability Check**: Verify that `GET /feedback-reporter/availability` returns the expected HTTP status for unauthenticated vs authenticated requests based on configuration.
2. **Public Page Submission**: Submit a test feedback report from the public site; verify DB persistence, private storage storage, and notification dispatch.
3. **Admin Page Submission**: Submit a report from within the admin panel (Filament or custom admin); verify that admin context is properly recorded in `metadata`.
4. **Masking Verification**: Ensure elements with `data-feedback-redact` are masked in captured screenshots and the modal itself (`data-feedback-ignore`) is excluded.
5. **Admin Review & Image Download**: Verify that reports, diagnostic context, and private attachments can be previewed and downloaded from the admin panel (or notification payload).

---

Please provide an implementation plan based on these requirements, confirm alignment, and proceed step-by-step.
```
