<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Actions;

use TrustMedical\FeedbackReporter\Models\FeedbackReport;

final class StoredFeedbackResult
{
    /**
     * Create a new result instance.
     *
     * @param  bool  $created  False when an existing report was returned for a repeated client_report_id.
     */
    public function __construct(
        public readonly FeedbackReport $report,
        public readonly bool $created,
    ) {}
}
