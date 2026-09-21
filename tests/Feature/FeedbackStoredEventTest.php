<?php

declare(strict_types=1);

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use TrustMedical\FeedbackReporter\Enums\AttachmentSource;
use TrustMedical\FeedbackReporter\Events\FeedbackStored;

beforeEach(function () {
    Storage::fake('local');
});

it('dispatches FeedbackStored event on successful report submission', function () {
    Event::fake([FeedbackStored::class]);

    $file = UploadedFile::fake()->image('test.png', 400, 300);

    $response = $this->post(route('feedback-reporter.store'), [
        'message' => 'Event test report',
        'attachments' => [
            ['file' => $file, 'source' => AttachmentSource::AutomaticCapture->value],
        ],
    ]);

    $response->assertStatus(201);
    $reportId = $response->json('id');

    Event::assertDispatched(FeedbackStored::class, function (FeedbackStored $event) use ($reportId) {
        return $event->feedback->id === $reportId
            && $event->feedback->attachments->count() === 1
            && $event->feedback->attachments->first()->source === AttachmentSource::AutomaticCapture;
    });
});

it('does not dispatch FeedbackStored event on validation failure', function () {
    Event::fake([FeedbackStored::class]);

    $response = $this->postJson(route('feedback-reporter.store'), [
        'message' => '',
        'attachments' => [],
    ]);

    $response->assertStatus(422);

    Event::assertNotDispatched(FeedbackStored::class);
});
