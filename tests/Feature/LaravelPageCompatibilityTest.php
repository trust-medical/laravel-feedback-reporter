<?php

declare(strict_types=1);

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use TrustMedical\FeedbackReporter\Models\FeedbackReport;

/*
| Pages rendered by Laravel (Blade layouts with the CSRF meta tag and a logged-in user) are the
| package's primary use case. These tests pin the shipped defaults so that supporting pages
| without a Laravel session never changes how those pages behave.
*/

beforeEach(function () {
    Storage::fake('local');
});

function laravelPageUser(string $id): Authenticatable
{
    $user = Mockery::mock(Authenticatable::class);
    $user->shouldReceive('getAuthIdentifier')->andReturn($id);

    return $user;
}

it('ships defaults that keep the routes behind the web middleware group and authentication', function () {
    /** @var array<string, mixed> $defaults */
    $defaults = require __DIR__.'/../../config/feedback-reporter.php';

    expect($defaults['route']['middleware'])->toBe(['web'])
        ->and($defaults['availability']['require_authentication'])->toBeTrue()
        ->and($defaults['availability']['environments'])->toBe(['local', 'staging']);
});

it('registers the default routes with the web middleware group', function () {
    foreach (['feedback-reporter.availability', 'feedback-reporter.store'] as $name) {
        $route = Route::getRoutes()->getByName($name);

        expect($route)->not->toBeNull()
            ->and($route->gatherMiddleware())->toContain('web');
    }
});

it('accepts a submission that carries the session CSRF token from the layout meta tag', function () {
    config(['session.driver' => 'array']);

    $this->withSession(['_token' => 'laravel-page-token'])
        ->postJson(
            route('feedback-reporter.store'),
            ['message' => 'Submitted from a Blade page'],
            ['X-CSRF-TOKEN' => 'laravel-page-token', 'X-Requested-With' => 'XMLHttpRequest'],
        )
        ->assertCreated()
        ->assertJson(['success' => true]);

    $this->assertDatabaseHas('feedback_reports', ['message' => 'Submitted from a Blade page']);
});

it('keeps availability tied to the logged-in user when authentication is required', function () {
    config(['feedback-reporter.availability.require_authentication' => true]);

    $this->getJson(route('feedback-reporter.availability'))
        ->assertOk()
        ->assertExactJson(['available' => false]);

    $this->postJson(route('feedback-reporter.store'), ['message' => 'Guest'])->assertNotFound();

    $this->assertDatabaseCount('feedback_reports', 0);

    $this->actingAs(laravelPageUser('user-1'))
        ->getJson(route('feedback-reporter.availability'))
        ->assertOk()
        ->assertJson(['available' => true]);

    $this->postJson(route('feedback-reporter.store'), ['message' => 'Logged in'])->assertCreated();

    expect(FeedbackReport::query()->where('message', 'Logged in')->value('user_id'))->toBe('user-1');
});
