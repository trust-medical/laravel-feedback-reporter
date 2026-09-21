<?php

declare(strict_types=1);

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use TrustMedical\FeedbackReporter\Actions\StoreFeedbackReport;
use TrustMedical\FeedbackReporter\Enums\AttachmentSource;
use TrustMedical\FeedbackReporter\Models\FeedbackReport;

beforeEach(function () {
    Storage::fake('local');
});

it('rejects upload exceeding maximum file count', function () {
    $files = [];
    for ($i = 0; $i < 6; $i++) {
        $files[] = [
            'file' => UploadedFile::fake()->image("img{$i}.png", 100, 100),
            'source' => AttachmentSource::Attachment->value,
        ];
    }

    $response = $this->post(route('feedback-reporter.store'), [
        'message' => 'Too many files test',
        'attachments' => $files,
    ], ['Accept' => 'application/json']);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['attachments']);
});

it('rejects upload with an oversized individual file', function () {
    // Limit is 5120 KB (5MB), create 6000 KB file
    $oversizedFile = UploadedFile::fake()->create('large.png', 6000, 'image/png');

    $response = $this->post(route('feedback-reporter.store'), [
        'attachments' => [
            ['file' => $oversizedFile, 'source' => AttachmentSource::Attachment->value],
        ],
    ], ['Accept' => 'application/json']);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['attachments.0.file']);
});

it('rejects upload exceeding total attachment size limit', function () {
    // Limit is 20480 KB (20MB), create 5 files of 4500 KB each (total 22.5 MB)
    $files = [];
    for ($i = 0; $i < 5; $i++) {
        $files[] = [
            'file' => UploadedFile::fake()->create("part{$i}.png", 4500, 'image/png'),
            'source' => AttachmentSource::Attachment->value,
        ];
    }

    $response = $this->post(route('feedback-reporter.store'), [
        'attachments' => $files,
    ], ['Accept' => 'application/json']);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['attachments']);
});

it('rejects SVG images due to XSS protection', function () {
    $svgFile = UploadedFile::fake()->create('exploit.svg', 10, 'image/svg+xml');

    $response = $this->post(route('feedback-reporter.store'), [
        'attachments' => [
            ['file' => $svgFile, 'source' => AttachmentSource::Attachment->value],
        ],
    ], ['Accept' => 'application/json']);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['attachments.0.file']);
});

it('stores attachments with date and ULID partition in safe storage path', function () {
    $file = UploadedFile::fake()->image('my_screenshot.png', 640, 480);

    $response = $this->post(route('feedback-reporter.store'), [
        'attachments' => [
            ['file' => $file, 'source' => AttachmentSource::AutomaticCapture->value],
        ],
    ]);

    $response->assertStatus(201);
    $reportId = $response->json('id');

    $report = FeedbackReport::with('attachments')->findOrFail($reportId);
    $attachment = $report->attachments->first();

    expect($attachment)->not->toBeNull();
    expect($attachment->path)->toStartWith('feedback-reports-test/');
    expect($attachment->original_filename)->toBe('my_screenshot.png');
    expect($attachment->mime_type)->toBe('image/png');
    expect($attachment->extension)->toBe('png');
    expect($attachment->width)->toBe(640);
    expect($attachment->height)->toBe(480);

    Storage::disk('local')->assertExists($attachment->path);
});

it('cleans up saved files if database transaction fails (orphan cleanup)', function () {
    $file1 = UploadedFile::fake()->image('test1.png', 200, 200);
    $file2 = UploadedFile::fake()->image('test2.png', 200, 200);

    // Force DB failure by mocking FeedbackReport::create to throw exception
    $action = app(StoreFeedbackReport::class);

    $request = request();
    $data = [
        'message' => 'Should roll back',
        'attachments' => [
            ['file' => $file1, 'source' => AttachmentSource::Attachment->value],
            ['file' => $file2, 'source' => AttachmentSource::Attachment->value],
        ],
    ];

    // Listen to DB and throw on beginTransaction
    DB::shouldReceive('transaction')
        ->once()
        ->andThrow(new RuntimeException('Simulated DB failure'));

    try {
        $action->execute($data, $request);
        $this->fail('Expected exception was not thrown.');
    } catch (RuntimeException $e) {
        expect($e->getMessage())->toBe('Simulated DB failure');
    }

    // Verify all stored files were removed
    $allFiles = Storage::disk('local')->allFiles();
    expect($allFiles)->toBeEmpty();
});
