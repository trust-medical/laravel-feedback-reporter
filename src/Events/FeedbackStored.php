<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Events;

use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use TrustMedical\FeedbackReporter\Models\FeedbackReport;

/**
 * Dispatched after a new feedback report has been committed to the database.
 */
final class FeedbackStored implements ShouldDispatchAfterCommit
{
    use Dispatchable, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public readonly FeedbackReport $feedback,
    ) {}
}
