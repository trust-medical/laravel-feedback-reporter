<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use TrustMedical\FeedbackReporter\Support\FeedbackAvailabilityChecker;

class CheckAvailabilityController
{
    public function __invoke(Request $request, FeedbackAvailabilityChecker $checker): JsonResponse
    {
        return response()->json([
            'available' => $checker->isAvailable($request),
        ]);
    }
}
