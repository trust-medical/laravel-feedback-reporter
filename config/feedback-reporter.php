<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Feedback Reporter Master Switch
    |--------------------------------------------------------------------------
    |
    | Globally enables or disables the feedback reporter functionality.
    | When disabled, availability checks return false and report submissions
    | are rejected with the configured disabled_response status code.
    |
    */
    'enabled' => (bool) env('FEEDBACK_REPORTER_ENABLED', false),

    /*
    |--------------------------------------------------------------------------
    | Availability Restrictions
    |--------------------------------------------------------------------------
    |
    | All conditions in availability must evaluate to true (AND logic).
    |
    */
    'availability' => [

        // Allowed application environments. If empty, all environments are allowed.
        'environments' => [
            'local',
            'staging',
        ],

        // Require an authenticated user via $request->user().
        'require_authentication' => true,

        // Allowed IP addresses or CIDR blocks (IPv4/IPv6).
        // If non-empty, the client IP must match at least one allowed entry.
        'allowed_ips' => [],

        // Denied IP addresses or CIDR blocks (IPv4/IPv6).
        // Evaluated before allowed_ips.
        'denied_ips' => [],

        // Optional Laravel Gate ability to check against $request->user().
        'gate' => null,

        // Optional custom policy class implementing TrustMedical\FeedbackReporter\Contracts\FeedbackAvailability.
        'policy' => null,

        // HTTP status code to return when access is denied (404 or 403 recommended).
        'disabled_response' => 404,

    ],

    /*
    |--------------------------------------------------------------------------
    | Routing Configuration
    |--------------------------------------------------------------------------
    */
    'route' => [

        // Whether to automatically register package routes in the ServiceProvider.
        'register' => (bool) env('FEEDBACK_REPORTER_REGISTER_ROUTES', true),

        // Route URL prefix. Set to '' or null for root-level routes.
        'prefix' => env('FEEDBACK_REPORTER_ROUTE_PREFIX', 'feedback-reporter'),

        // Route name prefix prepended to all package route names.
        'as' => env('FEEDBACK_REPORTER_ROUTE_AS', 'feedback-reporter.'),

        // Optional domain to restrict the routes to.
        'domain' => env('FEEDBACK_REPORTER_ROUTE_DOMAIN', null),

        'middleware' => [
            'web',
        ],

        // Sub-paths for individual routes relative to prefix.
        'paths' => [
            'availability' => env('FEEDBACK_REPORTER_ROUTE_PATH_AVAILABILITY', 'availability'),
            'store' => env('FEEDBACK_REPORTER_ROUTE_PATH_STORE', 'reports'),
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Rate Limiting
    |--------------------------------------------------------------------------
    */
    'rate_limit' => [

        'max_attempts' => 10,

        'decay_minutes' => 1,

    ],

    /*
    |--------------------------------------------------------------------------
    | Storage Configuration
    |--------------------------------------------------------------------------
    |
    | Storage disk and root directory for uploaded images.
    | A private disk (e.g. 'local') is strongly recommended.
    |
    */
    'storage' => [

        'disk' => env('FEEDBACK_REPORTER_DISK', 'local'),

        'path' => 'feedback-reports',

    ],

    /*
    |--------------------------------------------------------------------------
    | Attachments Configuration
    |--------------------------------------------------------------------------
    */
    'attachments' => [

        // Maximum number of image attachments allowed per feedback report.
        'max_files' => 5,

        // Maximum file size per image in kilobytes (default: 5120 KB = 5MB).
        'max_file_size_kb' => 5120,

        // Maximum total size for all images in kilobytes (default: 20480 KB = 20MB).
        'max_total_size_kb' => 20480,

        // Allowed real MIME types. SVG is NOT allowed by default for XSS safety.
        'allowed_mimes' => [
            'image/png',
            'image/jpeg',
            'image/webp',
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Metadata Configuration
    |--------------------------------------------------------------------------
    */
    'metadata' => [

        // Maximum JSON string size in bytes (default: 256 KB).
        'max_bytes' => 262144,

        // Maximum allowed nesting depth for metadata JSON structures.
        'max_depth' => 10,

    ],

    /*
    |--------------------------------------------------------------------------
    | Server Context
    |--------------------------------------------------------------------------
    |
    | Server-derived context attributes automatically injected into the report.
    |
    */
    'server_context' => [

        'capture_environment' => true,

        'capture_laravel_version' => true,

        'capture_php_version' => true,

    ],

];
