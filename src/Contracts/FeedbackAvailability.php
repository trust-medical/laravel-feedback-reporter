<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Contracts;

use Illuminate\Http\Request;

interface FeedbackAvailability
{
    /**
     * Determine whether the feedback reporter is available for the given request.
     */
    public function isAvailable(Request $request): bool;
}
