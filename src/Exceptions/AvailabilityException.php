<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Exceptions;

class AvailabilityException extends FeedbackReporterException
{
    public function __construct(
        string $message = 'Feedback reporter is currently unavailable.',
        public readonly int $statusCode = 404,
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, $statusCode, $previous);
    }
}
