<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use TrustMedical\FeedbackReporter\Http\Controllers\CheckAvailabilityController;
use TrustMedical\FeedbackReporter\Http\Controllers\StoreFeedbackController;
use TrustMedical\FeedbackReporter\Http\Middleware\EnsureFeedbackReporterIsAvailable;

$availabilityPath = (string) config('feedback-reporter.route.paths.availability', 'availability');
$storePath = (string) config('feedback-reporter.route.paths.store', 'reports');

Route::get($availabilityPath, CheckAvailabilityController::class)
    ->name('availability');

Route::post($storePath, StoreFeedbackController::class)
    ->middleware([
        EnsureFeedbackReporterIsAvailable::class,
        'throttle:feedback-reporter',
    ])
    ->name('store');
