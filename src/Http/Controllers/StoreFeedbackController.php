<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Http\Controllers;

use Illuminate\Http\JsonResponse;
use TrustMedical\FeedbackReporter\Actions\StoreFeedbackReport;
use TrustMedical\FeedbackReporter\Http\Requests\StoreFeedbackRequest;

class StoreFeedbackController
{
    public function __invoke(StoreFeedbackRequest $request, StoreFeedbackReport $action): JsonResponse
    {
        $result = $action->handle($request->validated(), $request);

        if (! $result->created) {
            return response()->json([
                'id' => $result->report->id,
                'success' => true,
                'duplicate' => true,
            ], 200);
        }

        return response()->json([
            'id' => $result->report->id,
            'success' => true,
        ], 201);
    }
}
