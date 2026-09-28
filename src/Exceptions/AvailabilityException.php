<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class AvailabilityException extends FeedbackReporterException implements HttpExceptionInterface
{
    public function __construct(
        string $message = 'Feedback reporter is currently unavailable.',
        public readonly int $statusCode = 404,
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, $statusCode, $previous);
    }

    /**
     * Get the HTTP status code rendered for this exception.
     */
    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    /**
     * Get the HTTP response headers.
     *
     * @return array<string, string>
     */
    public function getHeaders(): array
    {
        return [];
    }
}
