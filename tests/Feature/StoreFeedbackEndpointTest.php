<?php

declare(strict_types=1);

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use TrustMedical\FeedbackReporter\Enums\AttachmentSource;
use TrustMedical\FeedbackReporter\Models\FeedbackAttachment;
use TrustMedical\FeedbackReporter\Models\FeedbackReport;

beforeEach(function () {
    Storage::fake('local');
});

it('accepts feedback with message only', function () {
    $response = $this->postJson(route('feedback-reporter.store'), [
        'message' => 'Saving fails without error',
    ]);

    $response->assertStatus(201)
        ->assertJsonStructure(['id', 'success'])
        ->assertJson(['success' => true]);

    $reportId = $response->json('id');
    $this->assertDatabaseHas('feedback_reports', [
        'id' => $reportId,
        'message' => 'Saving fails without error',
    ]);

    expect(FeedbackAttachment::where('feedback_report_id', $reportId)->count())->toBe(0);
});

it('rejects the removed automatic capture source', function () {
    $file = UploadedFile::fake()->image('legacy-capture.png', 800, 600);

    $response = $this->post(route('feedback-reporter.store'), [
        'message' => 'Legacy source must be rejected',
        'attachments' => [[
            'file' => $file,
            'source' => 'automatic_capture',
        ]],
    ], ['Accept' => 'application/json']);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['attachments.0.source']);

    $this->assertDatabaseCount('feedback_reports', 0);
});

it('accepts feedback with a message and user screenshot', function () {
    $file = UploadedFile::fake()->image('user_ss.jpg', 1024, 768);

    $response = $this->post(route('feedback-reporter.store'), [
        'message' => 'Screenshot report',
        'attachments' => [
            [
                'file' => $file,
                'source' => AttachmentSource::UserScreenshot->value,
            ],
        ],
    ]);

    $response->assertStatus(201);
    $reportId = $response->json('id');

    $this->assertDatabaseHas('feedback_attachments', [
        'feedback_report_id' => $reportId,
        'source' => AttachmentSource::UserScreenshot->value,
    ]);
});

it('accepts feedback with a message and arbitrary attachment', function () {
    $file = UploadedFile::fake()->image('diagram.webp', 400, 400);

    $response = $this->post(route('feedback-reporter.store'), [
        'message' => 'Diagram report',
        'attachments' => [
            [
                'file' => $file,
                'source' => AttachmentSource::Attachment->value,
            ],
        ],
    ]);

    $response->assertStatus(201);
    $reportId = $response->json('id');

    $this->assertDatabaseHas('feedback_attachments', [
        'feedback_report_id' => $reportId,
        'source' => AttachmentSource::Attachment->value,
    ]);
});

it('accepts feedback with message and multiple mixed attachments', function () {
    $screenshot = UploadedFile::fake()->image('manual.png', 800, 600);
    $photo1 = UploadedFile::fake()->image('photo1.jpg', 500, 500);
    $photo2 = UploadedFile::fake()->image('photo2.webp', 600, 600);

    $response = $this->post(route('feedback-reporter.store'), [
        'message' => 'Multiple bugs observed',
        'attachments' => [
            ['file' => $screenshot, 'source' => AttachmentSource::UserScreenshot->value],
            ['file' => $photo1, 'source' => AttachmentSource::Attachment->value],
            ['file' => $photo2, 'source' => AttachmentSource::Attachment->value],
        ],
    ]);

    $response->assertStatus(201);
    $reportId = $response->json('id');

    $report = FeedbackReport::with('attachments')->findOrFail($reportId);
    expect($report->attachments)->toHaveCount(3);
    expect($report->attachments[0]->source)->toBe(AttachmentSource::UserScreenshot);
    expect($report->attachments[1]->source)->toBe(AttachmentSource::Attachment);
    expect($report->attachments[2]->source)->toBe(AttachmentSource::Attachment);
});

it('rejects feedback without a message even when an attachment is present', function () {
    $response = $this->post(route('feedback-reporter.store'), [
        'attachments' => [[
            'file' => UploadedFile::fake()->image('screenshot.png'),
            'source' => AttachmentSource::UserScreenshot->value,
        ]],
    ], [
        'Accept' => 'application/json',
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['message']);
});
