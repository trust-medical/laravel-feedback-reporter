<?php

declare(strict_types=1);

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use TrustMedical\FeedbackReporter\Actions\StoreFeedbackReport;
use TrustMedical\FeedbackReporter\Enums\AttachmentSource;
use TrustMedical\FeedbackReporter\Events\FeedbackStored;
use TrustMedical\FeedbackReporter\Models\FeedbackAttachment;
use TrustMedical\FeedbackReporter\Models\FeedbackReport;

beforeEach(function () {
    Storage::fake('local');
});

function feedbackUser(string $id): Authenticatable
{
    $user = Mockery::mock(Authenticatable::class);
    $user->shouldReceive('getAuthIdentifier')->andReturn($id);

    return $user;
}

it('keeps the stored report and files when a FeedbackStored listener fails', function () {
    Event::listen(FeedbackStored::class, function (): void {
        throw new RuntimeException('Notification service down');
    });

    $response = $this->post(route('feedback-reporter.store'), [
        'message' => 'Listener failure',
        'attachments' => [
            ['file' => UploadedFile::fake()->image('shot.png', 100, 100), 'source' => AttachmentSource::UserScreenshot->value],
        ],
    ]);

    $response->assertStatus(500);

    $report = FeedbackReport::with('attachments')->sole();
    expect($report->attachments)->toHaveCount(1);
    Storage::disk('local')->assertExists($report->attachments->first()->path);
});

it('dispatches FeedbackStored only after the outer transaction commits', function () {
    $dispatched = false;
    Event::listen(FeedbackStored::class, function () use (&$dispatched): void {
        $dispatched = true;
    });

    $request = Request::create('/feedback-reporter/reports', 'POST');

    DB::transaction(function () use ($request, &$dispatched): void {
        app(StoreFeedbackReport::class)->execute(['message' => 'Inside outer transaction'], $request);

        expect($dispatched)->toBeFalse();
    });

    expect($dispatched)->toBeTrue();
});

it('returns the existing report with 200 for a repeated client_report_id from the same guest', function () {
    $payload = [
        'client_report_id' => '8f2d1c7e-4b6a-4e5f-9a1b-2c3d4e5f6a7b',
        'message' => 'Retried submission',
        'attachments' => [
            ['file' => UploadedFile::fake()->image('shot.png', 100, 100), 'source' => AttachmentSource::UserScreenshot->value],
        ],
    ];

    $first = $this->post(route('feedback-reporter.store'), $payload);
    $first->assertStatus(201)->assertJsonMissing(['duplicate' => true]);

    $filesAfterFirst = Storage::disk('local')->allFiles();

    $payload['attachments'][0]['file'] = UploadedFile::fake()->image('shot.png', 100, 100);
    $second = $this->post(route('feedback-reporter.store'), $payload);

    $second->assertStatus(200)
        ->assertExactJson(['id' => $first->json('id'), 'success' => true, 'duplicate' => true]);

    $this->assertDatabaseCount('feedback_reports', 1);
    $this->assertDatabaseCount('feedback_attachments', 1);
    expect(Storage::disk('local')->allFiles())->toBe($filesAfterFirst);
});

it('rejects a client_report_id that belongs to another user', function () {
    $clientReportId = 'report-key-123456';

    $this->actingAs(feedbackUser('user-a'))
        ->postJson(route('feedback-reporter.store'), ['client_report_id' => $clientReportId, 'message' => 'First'])
        ->assertStatus(201);

    $this->actingAs(feedbackUser('user-b'))
        ->postJson(route('feedback-reporter.store'), ['client_report_id' => $clientReportId, 'message' => 'Second'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['client_report_id']);

    $this->assertDatabaseCount('feedback_reports', 1);
});

it('rejects a malformed client_report_id', function () {
    $this->postJson(route('feedback-reporter.store'), ['client_report_id' => 'bad id!', 'message' => 'Hello'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['client_report_id']);
});

it('resolves a concurrent duplicate to the existing report and removes its own files', function () {
    $existing = FeedbackReport::create([
        'client_report_id' => 'concurrent-key-1',
        'message' => 'Won the race',
        'ip_address' => '127.0.0.1',
    ]);

    // Simulate a request that passed the initial lookup before the other request committed
    $action = new class extends StoreFeedbackReport
    {
        private int $lookups = 0;

        protected function findExisting(string $clientReportId, Request $request): ?FeedbackReport
        {
            return $this->lookups++ === 0 ? null : parent::findExisting($clientReportId, $request);
        }
    };

    $request = Request::create('/feedback-reporter/reports', 'POST', server: ['REMOTE_ADDR' => '127.0.0.1']);

    $result = $action->handle([
        'client_report_id' => 'concurrent-key-1',
        'message' => 'Lost the race',
        'attachments' => [
            ['file' => UploadedFile::fake()->image('shot.png', 50, 50), 'source' => AttachmentSource::Attachment->value],
        ],
    ], $request);

    expect($result->created)->toBeFalse();
    expect($result->report->id)->toBe($existing->id);
    expect(Storage::disk('local')->allFiles())->toBeEmpty();
    $this->assertDatabaseCount('feedback_reports', 1);
});

it('rejects metadata that is not valid JSON', function () {
    $this->postJson(route('feedback-reporter.store'), ['message' => 'Hello', 'metadata' => '{not json'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['metadata']);
});

it('stores client metadata and overrides a client-supplied server key', function () {
    $response = $this->postJson(route('feedback-reporter.store'), [
        'message' => 'Hello',
        'metadata' => json_encode(['page' => ['path' => '/orders'], 'server' => ['ip_address' => '1.1.1.1']]),
    ]);

    $response->assertStatus(201);

    $report = FeedbackReport::findOrFail($response->json('id'));
    expect($report->metadata['page'])->toBe(['path' => '/orders']);
    expect($report->metadata['server']['ip_address'])->toBe('127.0.0.1');
});

it('rejects a file whose real content is not an image despite its extension', function () {
    $path = tempnam(sys_get_temp_dir(), 'fr');
    file_put_contents($path, '<html><script>alert(1)</script></html>');
    $file = new UploadedFile($path, 'evil.png', 'image/png', null, true);

    $this->post(route('feedback-reporter.store'), [
        'message' => 'Spoofed MIME',
        'attachments' => [['file' => $file, 'source' => AttachmentSource::Attachment->value]],
    ])->assertUnprocessable()->assertJsonValidationErrors(['attachments.0.file']);

    $this->assertDatabaseCount('feedback_reports', 0);
});

it('rejects images above the configured pixel limit', function () {
    Config::set('feedback-reporter.attachments.max_pixels', 100);

    $this->post(route('feedback-reporter.store'), [
        'message' => 'Too many pixels',
        'attachments' => [['file' => UploadedFile::fake()->image('big.png', 20, 20), 'source' => AttachmentSource::Attachment->value]],
    ])->assertUnprocessable()->assertJsonValidationErrors(['attachments.0.file']);
});

it('rejects every attachment instead of failing when no MIME types are allowed', function () {
    Config::set('feedback-reporter.attachments.allowed_mimes', []);

    $this->post(route('feedback-reporter.store'), [
        'message' => 'No MIME types allowed',
        'attachments' => [['file' => UploadedFile::fake()->image('shot.png', 20, 20), 'source' => AttachmentSource::Attachment->value]],
    ])->assertUnprocessable()->assertJsonValidationErrors(['attachments.0.file']);
});

it('validates page_url scheme, dimension bounds, and timezone', function () {
    $this->postJson(route('feedback-reporter.store'), [
        'message' => 'Hello',
        'page_url' => 'javascript:alert(1)',
        'viewport_width' => 99999999999,
        'timezone' => 'Mars/Olympus_Mons',
    ])->assertUnprocessable()->assertJsonValidationErrors(['page_url', 'viewport_width', 'timezone']);

    $this->postJson(route('feedback-reporter.store'), [
        'message' => 'Hello',
        'page_url' => 'https://example.com/orders',
        'viewport_width' => 1280,
        'timezone' => 'Asia/Tokyo',
    ])->assertStatus(201);
});

it('responds with JSON even when the client does not send an Accept header', function () {
    $response = $this->post(route('feedback-reporter.store'), ['message' => '']);

    $response->assertUnprocessable()->assertJsonValidationErrors(['message']);
});

it('does not reveal the package in unavailable responses', function () {
    Config::set('feedback-reporter.enabled', false);

    $response = $this->postJson(route('feedback-reporter.store'), ['message' => 'Hello']);

    $response->assertNotFound();
    expect($response->getContent())->not->toContain('Feedback reporter');
});

it('uses 403 when configured and falls back to 404 for unsupported statuses', function () {
    Config::set('feedback-reporter.enabled', false);

    Config::set('feedback-reporter.availability.disabled_response', 403);
    $this->postJson(route('feedback-reporter.store'), ['message' => 'Hello'])->assertForbidden();

    Config::set('feedback-reporter.availability.disabled_response', 200);
    $this->postJson(route('feedback-reporter.store'), ['message' => 'Hello'])->assertNotFound();
});

it('returns limits only when the reporter is available', function () {
    $this->getJson(route('feedback-reporter.availability'))
        ->assertOk()
        ->assertExactJson([
            'available' => true,
            'limits' => [
                'max_files' => 5,
                'max_file_size_kb' => 5120,
                'max_total_size_kb' => 20480,
                'allowed_mimes' => ['image/png', 'image/jpeg', 'image/webp'],
                'max_message_length' => 10000,
                'max_metadata_bytes' => 262144,
                'max_metadata_depth' => 10,
            ],
        ]);

    Config::set('feedback-reporter.enabled', false);

    $this->getJson(route('feedback-reporter.availability'))
        ->assertOk()
        ->assertExactJson(['available' => false]);
});

it('deletes attachment files when a report is deleted', function () {
    $response = $this->post(route('feedback-reporter.store'), [
        'message' => 'Delete me',
        'attachments' => [['file' => UploadedFile::fake()->image('shot.png', 50, 50), 'source' => AttachmentSource::Attachment->value]],
    ]);

    $report = FeedbackReport::with('attachments')->findOrFail($response->json('id'));
    $path = $report->attachments->first()->path;
    Storage::disk('local')->assertExists($path);

    $report->delete();

    Storage::disk('local')->assertMissing($path);
    expect(FeedbackAttachment::count())->toBe(0);
});

it('prunes reports older than the retention period together with their files', function () {
    Config::set('feedback-reporter.retention.days', 30);

    $old = $this->post(route('feedback-reporter.store'), [
        'message' => 'Old report',
        'attachments' => [['file' => UploadedFile::fake()->image('old.png', 50, 50), 'source' => AttachmentSource::Attachment->value]],
    ])->json('id');
    $recent = $this->postJson(route('feedback-reporter.store'), ['message' => 'Recent report'])->json('id');

    FeedbackReport::whereKey($old)->update(['created_at' => now()->subDays(31)]);
    $oldPath = FeedbackAttachment::where('feedback_report_id', $old)->value('path');

    $this->artisan('model:prune', ['--model' => [FeedbackReport::class]])->assertSuccessful();

    expect(FeedbackReport::find($old))->toBeNull();
    expect(FeedbackReport::find($recent))->not->toBeNull();
    Storage::disk('local')->assertMissing($oldPath);
});

it('does not prune anything when retention is disabled', function () {
    $id = $this->postJson(route('feedback-reporter.store'), ['message' => 'Keep me'])->json('id');
    FeedbackReport::whereKey($id)->update(['created_at' => now()->subYears(5)]);

    $this->artisan('model:prune', ['--model' => [FeedbackReport::class]])->assertSuccessful();

    expect(FeedbackReport::find($id))->not->toBeNull();
});

it('hides the IP address and User-Agent when a report is serialized', function () {
    $id = $this->postJson(route('feedback-reporter.store'), ['message' => 'Serialize me'])->json('id');

    expect(FeedbackReport::findOrFail($id)->toArray())->not->toHaveKeys(['ip_address', 'user_agent']);
});

it('rolls back and reapplies the index migration', function () {
    $migration = require __DIR__.'/../../database/migrations/2026_09_28_000004_add_indexes_to_feedback_tables.php';

    $migration->down();
    $migration->up();

    $this->postJson(route('feedback-reporter.store'), ['message' => 'After migration'])->assertStatus(201);
});
