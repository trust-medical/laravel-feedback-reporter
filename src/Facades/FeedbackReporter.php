<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @method static bool available(\Illuminate\Http\Request|null $request = null)
 * @method static \TrustMedical\FeedbackReporter\Support\FeedbackAvailabilityChecker checker()
 *
 * @see \TrustMedical\FeedbackReporter\FeedbackReporter
 */
class FeedbackReporter extends Facade
{
    /**
     * Get the registered name of the component.
     */
    protected static function getFacadeAccessor(): string
    {
        return 'feedback-reporter';
    }
}
