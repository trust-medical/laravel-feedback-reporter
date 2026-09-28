<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use TrustMedical\FeedbackReporter\Exceptions\AvailabilityException;
use TrustMedical\FeedbackReporter\Support\FeedbackAvailabilityChecker;

class EnsureFeedbackReporterIsAvailable
{
    public function __construct(
        protected FeedbackAvailabilityChecker $checker,
    ) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            $this->checker->ensureAvailable($request);
        } catch (AvailabilityException $e) {
            // Respond without a message so the body does not reveal the package
            abort($e->statusCode, '');
        }

        return $next($request);
    }
}
