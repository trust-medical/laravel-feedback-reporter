<?php

declare(strict_types=1);

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use TrustMedical\FeedbackReporter\Contracts\FeedbackAvailability;
use TrustMedical\FeedbackReporter\FeedbackReporter;

afterEach(function () {
    FeedbackReporter::$registersRoutes = true;
});

it('registers default route names and URIs properly', function () {
    expect(Route::has('feedback-reporter.availability'))->toBeTrue();
    expect(Route::has('feedback-reporter.store'))->toBeTrue();

    expect(route('feedback-reporter.availability'))->toContain('/feedback-reporter/availability');
    expect(route('feedback-reporter.store'))->toContain('/feedback-reporter/reports');

    $response = $this->getJson(route('feedback-reporter.availability'));
    $response->assertStatus(200)
        ->assertJson(['available' => true]);
});

it('can disable route registration via static method ignoreRoutes', function () {
    expect(FeedbackReporter::shouldRegisterRoutes())->toBeTrue();

    FeedbackReporter::ignoreRoutes();

    expect(FeedbackReporter::shouldRegisterRoutes())->toBeFalse();
});

it('can disable route registration via config', function () {
    expect(FeedbackReporter::shouldRegisterRoutes())->toBeTrue();

    config(['feedback-reporter.route.register' => false]);

    expect(FeedbackReporter::shouldRegisterRoutes())->toBeFalse();
});

it('respects custom route name prefix and custom paths', function () {
    config([
        'feedback-reporter.route.prefix' => 'support-desk',
        'feedback-reporter.route.as' => 'support.feedback.',
        'feedback-reporter.route.paths.availability' => 'health-check',
        'feedback-reporter.route.paths.store' => 'submit-report',
    ]);

    FeedbackReporter::routes();

    expect(Route::has('support.feedback.availability'))->toBeTrue();
    expect(Route::has('support.feedback.store'))->toBeTrue();

    $availabilityUrl = route('support.feedback.availability');
    $storeUrl = route('support.feedback.store');

    expect($availabilityUrl)->toContain('/support-desk/health-check');
    expect($storeUrl)->toContain('/support-desk/submit-report');

    $this->getJson($availabilityUrl)
        ->assertStatus(200)
        ->assertJson(['available' => true]);
});

it('allows manual route registration with custom options via FeedbackReporter::routes', function () {
    FeedbackReporter::routes(null, [
        'prefix' => 'api/v2/feedback',
        'as' => 'api.v2.feedback.',
    ]);

    expect(Route::has('api.v2.feedback.availability'))->toBeTrue();
    expect(Route::has('api.v2.feedback.store'))->toBeTrue();

    $availabilityUrl = route('api.v2.feedback.availability');
    expect($availabilityUrl)->toContain('/api/v2/feedback/availability');

    $this->getJson($availabilityUrl)
        ->assertStatus(200)
        ->assertJson(['available' => true]);
});

it('supports custom route callback in FeedbackReporter::routes', function () {
    FeedbackReporter::routes(function (): void {
        Route::get('/ping', fn () => response()->json(['status' => 'ok']))->name('ping');
    }, [
        'prefix' => 'custom-health',
        'as' => 'custom-health.',
    ]);

    expect(Route::has('custom-health.ping'))->toBeTrue();

    $this->getJson('/custom-health/ping')
        ->assertStatus(200)
        ->assertJson(['status' => 'ok']);
});

it('rate limits the availability endpoint independently of submissions', function () {
    config([
        'feedback-reporter.rate_limit.availability_max_attempts' => 2,
        'feedback-reporter.rate_limit.max_attempts' => 1,
    ]);

    $availabilityUrl = route('feedback-reporter.availability');

    $this->getJson($availabilityUrl)->assertStatus(200);
    $this->getJson($availabilityUrl)->assertStatus(200);
    $this->getJson($availabilityUrl)->assertStatus(429);

    $this->postJson(route('feedback-reporter.store'), [])->assertStatus(422);
});

it('serves guests without starting a session when the routes use the api middleware', function () {
    FeedbackReporter::routes(null, [
        'prefix' => 'static-page/feedback',
        'as' => 'static-page.feedback.',
        'middleware' => ['api'],
    ]);

    $sessionCookie = (string) config('session.cookie');

    $this->getJson(route('static-page.feedback.availability'))
        ->assertOk()
        ->assertJson(['available' => true])
        ->assertCookieMissing($sessionCookie);

    $this->postJson(route('static-page.feedback.store'), ['message' => 'From a static page'])
        ->assertCreated()
        ->assertJson(['success' => true])
        ->assertCookieMissing($sessionCookie);

    $this->assertDatabaseHas('feedback_reports', ['message' => 'From a static page']);
});

it('lets a policy gate the routes on a request header sent by the frontend', function () {
    config([
        'feedback-reporter.availability.policy' => new class implements FeedbackAvailability
        {
            public function isAvailable(Request $request): bool
            {
                return $request->header('X-Feedback-Token') === 'shared-token';
            }
        },
    ]);

    $this->getJson(route('feedback-reporter.availability'))
        ->assertOk()
        ->assertExactJson(['available' => false]);

    $this->getJson(route('feedback-reporter.availability'), ['X-Feedback-Token' => 'shared-token'])
        ->assertOk()
        ->assertJson(['available' => true]);

    $this->postJson(route('feedback-reporter.store'), ['message' => 'No token'])->assertNotFound();

    $this->postJson(
        route('feedback-reporter.store'),
        ['message' => 'With token'],
        ['X-Feedback-Token' => 'shared-token'],
    )->assertCreated();
});
