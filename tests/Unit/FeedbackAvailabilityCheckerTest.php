<?php

declare(strict_types=1);

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Gate;
use TrustMedical\FeedbackReporter\Contracts\FeedbackAvailability;
use TrustMedical\FeedbackReporter\Exceptions\AvailabilityException;
use TrustMedical\FeedbackReporter\Support\FeedbackAvailabilityChecker;

beforeEach(function () {
    $this->checker = app(FeedbackAvailabilityChecker::class);
});

it('returns false when package is disabled', function () {
    Config::set('feedback-reporter.enabled', false);

    expect($this->checker->isAvailable())->toBeFalse();
});

it('evaluates environment restrictions correctly', function () {
    Config::set('feedback-reporter.enabled', true);
    Config::set('feedback-reporter.availability.environments', ['staging', 'production']);

    // Current test environment is 'testing'
    expect($this->checker->isAvailable())->toBeFalse();

    Config::set('feedback-reporter.availability.environments', ['testing']);
    expect($this->checker->isAvailable())->toBeTrue();
});

it('enforces authentication requirement', function () {
    Config::set('feedback-reporter.enabled', true);
    Config::set('feedback-reporter.availability.environments', ['testing']);
    Config::set('feedback-reporter.availability.require_authentication', true);

    $guestRequest = Request::create('/feedback-reporter/availability', 'GET');
    expect($this->checker->isAvailable($guestRequest))->toBeFalse();

    $user = Mockery::mock(Authenticatable::class);
    $user->shouldReceive('getAuthIdentifier')->andReturn('user-123');

    $authRequest = Request::create('/feedback-reporter/availability', 'GET');
    $authRequest->setUserResolver(fn () => $user);

    expect($this->checker->isAvailable($authRequest))->toBeTrue();
});

it('evaluates IP allowlist and denylist with CIDR', function () {
    Config::set('feedback-reporter.enabled', true);
    Config::set('feedback-reporter.availability.environments', ['testing']);
    Config::set('feedback-reporter.availability.require_authentication', false);

    // 1. Denylist has precedence
    Config::set('feedback-reporter.availability.denied_ips', ['192.168.1.0/24']);
    Config::set('feedback-reporter.availability.allowed_ips', ['192.168.0.0/16']);

    $deniedRequest = Request::create('/test', 'GET', [], [], [], ['REMOTE_ADDR' => '192.168.1.50']);
    expect($this->checker->isAvailable($deniedRequest))->toBeFalse();

    $allowedRequest = Request::create('/test', 'GET', [], [], [], ['REMOTE_ADDR' => '192.168.2.50']);
    expect($this->checker->isAvailable($allowedRequest))->toBeTrue();

    // Outside allowlist
    $outsideRequest = Request::create('/test', 'GET', [], [], [], ['REMOTE_ADDR' => '10.0.0.1']);
    expect($this->checker->isAvailable($outsideRequest))->toBeFalse();
});

it('evaluates Gate authorization if configured', function () {
    Config::set('feedback-reporter.enabled', true);
    Config::set('feedback-reporter.availability.environments', ['testing']);
    Config::set('feedback-reporter.availability.require_authentication', false);
    Config::set('feedback-reporter.availability.gate', 'submit-feedback');

    Gate::define('submit-feedback', fn (?Authenticatable $user = null) => false);
    expect($this->checker->isAvailable())->toBeFalse();

    Gate::define('submit-feedback', fn (?Authenticatable $user = null) => true);
    expect($this->checker->isAvailable())->toBeTrue();
});

it('evaluates custom policy implementing FeedbackAvailability', function () {
    Config::set('feedback-reporter.enabled', true);
    Config::set('feedback-reporter.availability.environments', ['testing']);
    Config::set('feedback-reporter.availability.require_authentication', false);

    $customPolicy = new class implements FeedbackAvailability
    {
        public bool $allow = true;

        public function isAvailable(Request $request): bool
        {
            return $this->allow;
        }
    };

    Config::set('feedback-reporter.availability.policy', $customPolicy);

    $customPolicy->allow = false;
    expect($this->checker->isAvailable())->toBeFalse();

    $customPolicy->allow = true;
    expect($this->checker->isAvailable())->toBeTrue();
});

it('throws AvailabilityException when ensureAvailable fails', function () {
    Config::set('feedback-reporter.enabled', false);
    Config::set('feedback-reporter.availability.disabled_response', 404);

    $request = Request::create('/test', 'GET');

    expect(fn () => $this->checker->ensureAvailable($request))
        ->toThrow(AvailabilityException::class);
});
