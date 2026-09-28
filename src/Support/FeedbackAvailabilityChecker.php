<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\IpUtils;
use TrustMedical\FeedbackReporter\Contracts\FeedbackAvailability;
use TrustMedical\FeedbackReporter\Exceptions\AvailabilityException;

class FeedbackAvailabilityChecker
{
    /**
     * Determine if the feedback reporter is currently available for the given request.
     */
    public function isAvailable(?Request $request = null): bool
    {
        $request ??= request();

        // 1. Master switch
        if (! config('feedback-reporter.enabled', false)) {
            return false;
        }

        // 2. Environment check
        /** @var array<int, string> $allowedEnvironments */
        $allowedEnvironments = config('feedback-reporter.availability.environments', []);
        if (! empty($allowedEnvironments) && ! in_array(app()->environment(), $allowedEnvironments, true)) {
            return false;
        }

        // 3. Authentication requirement
        if (config('feedback-reporter.availability.require_authentication', true) && $request->user() === null) {
            return false;
        }

        $clientIp = $request->ip();

        // 4. IP Denylist (denied_ips has higher priority)
        /** @var array<int, string> $deniedIps */
        $deniedIps = config('feedback-reporter.availability.denied_ips', []);
        if (! empty($deniedIps) && $clientIp !== null && IpUtils::checkIp($clientIp, $deniedIps)) {
            return false;
        }

        // 5. IP Allowlist
        /** @var array<int, string> $allowedIps */
        $allowedIps = config('feedback-reporter.availability.allowed_ips', []);
        if (! empty($allowedIps)) {
            if ($clientIp === null || ! IpUtils::checkIp($clientIp, $allowedIps)) {
                return false;
            }
        }

        // 6. Gate check
        /** @var string|null $gate */
        $gate = config('feedback-reporter.availability.gate');
        if ($gate !== null) {
            $user = $request->user();
            $allowed = $user !== null
                ? Gate::forUser($user)->allows($gate)
                : Gate::allows($gate);

            if (! $allowed) {
                return false;
            }
        }

        // 7. Custom Policy check
        /** @var class-string<FeedbackAvailability>|FeedbackAvailability|null $policyClass */
        $policyClass = config('feedback-reporter.availability.policy');
        if ($policyClass !== null) {
            $policyInstance = is_string($policyClass) ? app($policyClass) : $policyClass;

            // Fail closed when the configured policy does not implement the contract.
            if (! $policyInstance instanceof FeedbackAvailability || ! $policyInstance->isAvailable($request)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Ensure the feedback reporter is available, or throw an AvailabilityException.
     *
     * @throws AvailabilityException
     */
    public function ensureAvailable(Request $request): void
    {
        if (! $this->isAvailable($request)) {
            $status = (int) config('feedback-reporter.availability.disabled_response', 404);

            throw new AvailabilityException(
                message: 'Feedback reporter is currently unavailable.',
                statusCode: $status,
            );
        }
    }
}
