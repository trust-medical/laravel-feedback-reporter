<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use TrustMedical\FeedbackReporter\Http\Controllers\CheckAvailabilityController;
use TrustMedical\FeedbackReporter\Http\Controllers\StoreFeedbackController;
use TrustMedical\FeedbackReporter\Http\Middleware\EnsureFeedbackReporterIsAvailable;
use TrustMedical\FeedbackReporter\Http\Middleware\ForceJsonResponse;

$availabilityPath = (string) config('feedback-reporter.route.paths.availability', 'availability');
$storePath = (string) config('feedback-reporter.route.paths.store', 'reports');

Route::get($availabilityPath, CheckAvailabilityController::class)
    ->middleware([
        ForceJsonResponse::class,
        'throttle:feedback-reporter-availability',
    ])
    ->name('availability');

Route::post($storePath, StoreFeedbackController::class)
    ->middleware([
        ForceJsonResponse::class,
        EnsureFeedbackReporterIsAvailable::class,
        'throttle:feedback-reporter',
    ])
    ->name('store');
