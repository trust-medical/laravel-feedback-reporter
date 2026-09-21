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
        $report = $action->execute($request->validated(), $request);

        return response()->json([
            'id' => $report->id,
            'success' => true,
        ], 201);
    }
}
