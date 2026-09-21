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

it('accepts feedback with automatic capture only', function () {
    $file = UploadedFile::fake()->image('capture.png', 800, 600);

    $response = $this->post(route('feedback-reporter.store'), [
        'attachments' => [
            [
                'file' => $file,
                'source' => AttachmentSource::AutomaticCapture->value,
            ],
        ],
    ]);

    $response->assertStatus(201);
    $reportId = $response->json('id');

    $this->assertDatabaseHas('feedback_attachments', [
        'feedback_report_id' => $reportId,
        'source' => AttachmentSource::AutomaticCapture->value,
    ]);
});

it('accepts feedback with user screenshot only', function () {
    $file = UploadedFile::fake()->image('user_ss.jpg', 1024, 768);

    $response = $this->post(route('feedback-reporter.store'), [
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

it('accepts feedback with arbitrary attachment only', function () {
    $file = UploadedFile::fake()->image('diagram.webp', 400, 400);

    $response = $this->post(route('feedback-reporter.store'), [
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
    $capture = UploadedFile::fake()->image('auto.png', 1200, 800);
    $screenshot = UploadedFile::fake()->image('manual.png', 800, 600);
    $photo1 = UploadedFile::fake()->image('photo1.jpg', 500, 500);
    $photo2 = UploadedFile::fake()->image('photo2.webp', 600, 600);

    $response = $this->post(route('feedback-reporter.store'), [
        'message' => 'Multiple bugs observed',
        'attachments' => [
            ['file' => $capture, 'source' => AttachmentSource::AutomaticCapture->value],
            ['file' => $screenshot, 'source' => AttachmentSource::UserScreenshot->value],
            ['file' => $photo1, 'source' => AttachmentSource::Attachment->value],
            ['file' => $photo2, 'source' => AttachmentSource::Attachment->value],
        ],
    ]);

    $response->assertStatus(201);
    $reportId = $response->json('id');

    $report = FeedbackReport::with('attachments')->findOrFail($reportId);
    expect($report->attachments)->toHaveCount(4);
    expect($report->attachments[0]->source)->toBe(AttachmentSource::AutomaticCapture);
    expect($report->attachments[1]->source)->toBe(AttachmentSource::UserScreenshot);
    expect($report->attachments[2]->source)->toBe(AttachmentSource::Attachment);
    expect($report->attachments[3]->source)->toBe(AttachmentSource::Attachment);
});

it('rejects feedback when both message and attachments are empty', function () {
    $response = $this->postJson(route('feedback-reporter.store'), [
        'message' => '',
        'attachments' => [],
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['message']);
});
