<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use TrustMedical\FeedbackReporter\Models\FeedbackReport;

final class FeedbackStored
{
    use Dispatchable, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public readonly FeedbackReport $feedback,
    ) {}
}
