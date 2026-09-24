<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use TrustMedical\FeedbackReporter\Enums\AttachmentSource;
use TrustMedical\FeedbackReporter\Models\FeedbackAttachment;

it('normalizes legacy automatic captures to user screenshots', function (): void {
    DB::table('feedback_reports')->insert([
        'id' => '01KLEGACYREPORT0000000000000',
        'message' => 'Legacy report',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('feedback_attachments')->insert([
        'id' => '01KLEGACYATTACH0000000000000',
        'feedback_report_id' => '01KLEGACYREPORT0000000000000',
        'source' => 'automatic_capture',
        'disk' => 'local',
        'path' => 'feedback-reports/legacy.png',
        'mime_type' => 'image/png',
        'extension' => 'png',
        'size' => 100,
        'sort_order' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $migration = require __DIR__.'/../../database/migrations/2026_09_23_000003_migrate_automatic_capture_attachment_sources.php';

    $migration->up();

    $attachment = FeedbackAttachment::query()->sole();
    expect($attachment->source)->toBe(AttachmentSource::UserScreenshot);
});
