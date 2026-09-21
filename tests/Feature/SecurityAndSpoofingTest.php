<?php

declare(strict_types=1);

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Config;
use TrustMedical\FeedbackReporter\Models\FeedbackReport;

it('ignores forged client ip_address and user_id in payload', function () {
    $mockUser = Mockery::mock(Authenticatable::class);
    $mockUser->shouldReceive('getAuthIdentifier')->andReturn('legitimate-user-999');

    $this->actingAs($mockUser);

    $response = $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.42'])
        ->postJson(route('feedback-reporter.store'), [
            'message' => 'Spoofing test',
            'ip_address' => '1.1.1.1',
            'user_id' => 'hacked-admin-id',
        ]);

    $response->assertStatus(201);
    $reportId = $response->json('id');

    $report = FeedbackReport::findOrFail($reportId);
    expect($report->ip_address)->toBe('203.0.113.42');
    expect($report->user_id)->toBe('legitimate-user-999');
});

it('rejects oversized metadata payload', function () {
    Config::set('feedback-reporter.metadata.max_bytes', 1000);

    $hugeString = str_repeat('A', 2000);

    $response = $this->postJson(route('feedback-reporter.store'), [
        'message' => 'Oversized metadata',
        'metadata' => json_encode(['data' => $hugeString]),
    ]);

    $response->assertStatus(500); // Exception in MetadataSanitizer
});

it('rejects deeply nested metadata structures (JSON bomb protection)', function () {
    Config::set('feedback-reporter.metadata.max_depth', 5);

    // Create 15-level nested structure
    $nested = ['value' => 'deep'];
    for ($i = 0; $i < 15; $i++) {
        $nested = ['child' => $nested];
    }

    $response = $this->postJson(route('feedback-reporter.store'), [
        'message' => 'Deep nesting',
        'metadata' => json_encode($nested),
    ]);

    $response->assertStatus(500);
});

it('returns configured disabled_response status when reporter is unavailable', function () {
    Config::set('feedback-reporter.enabled', false);
    Config::set('feedback-reporter.availability.disabled_response', 404);

    $response = $this->postJson(route('feedback-reporter.store'), [
        'message' => 'Should be 404',
    ]);

    $response->assertStatus(404);
});
