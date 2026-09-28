<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use TrustMedical\FeedbackReporter\Support\FeedbackAvailabilityChecker;
use TrustMedical\FeedbackReporter\Support\FeedbackLimits;

class CheckAvailabilityController
{
    public function __invoke(Request $request, FeedbackAvailabilityChecker $checker): JsonResponse
    {
        if (! $checker->isAvailable($request)) {
            return response()->json(['available' => false]);
        }

        // Limits are only exposed to requests that may submit feedback
        return response()->json([
            'available' => true,
            'limits' => FeedbackLimits::toArray(),
        ]);
    }
}
