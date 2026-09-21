<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Actions;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;
use TrustMedical\FeedbackReporter\Enums\AttachmentSource;
use TrustMedical\FeedbackReporter\Events\FeedbackStored;
use TrustMedical\FeedbackReporter\Exceptions\AttachmentStorageException;
use TrustMedical\FeedbackReporter\Models\FeedbackAttachment;
use TrustMedical\FeedbackReporter\Models\FeedbackReport;
use TrustMedical\FeedbackReporter\Support\ImageDimensionReader;
use TrustMedical\FeedbackReporter\Support\MetadataSanitizer;

class StoreFeedbackReport
{
    /**
     * Store the feedback report and its attachments with all-or-nothing atomicity.
     *
     * @param  array<string, mixed>  $validatedData
     *
     * @throws AttachmentStorageException|Throwable
     */
    public function execute(array $validatedData, Request $request): FeedbackReport
    {
        $diskName = (string) config('feedback-reporter.storage.disk', 'local');
        $baseStoragePath = (string) config('feedback-reporter.storage.path', 'feedback-reports');
        $disk = Storage::disk($diskName);

        $reportId = (string) Str::ulid();
        $datePrefix = Carbon::now()->format('Y/m/d');
        $reportStorageDirectory = "{$baseStoragePath}/{$datePrefix}/{$reportId}";

        /** @var array<int, string> $savedFilePaths */
        $savedFilePaths = [];

        /** @var array<int, array<string, mixed>> $attachmentRecords */
        $attachmentRecords = [];

        /** @var array<int, array{file: UploadedFile, source: string|AttachmentSource}> $rawAttachments */
        $rawAttachments = $validatedData['attachments'] ?? [];

        try {
            // 1. Save all attachment files to the configured storage disk
            $sortOrder = 0;
            foreach ($rawAttachments as $attachmentItem) {
                /** @var UploadedFile $file */
                $file = $attachmentItem['file'];
                $source = $attachmentItem['source'] instanceof AttachmentSource
                    ? $attachmentItem['source']
                    : AttachmentSource::from((string) $attachmentItem['source']);

                $attachmentId = (string) Str::ulid();
                $extension = strtolower($file->guessExtension() ?: $file->getClientOriginalExtension() ?: 'bin');
                $filename = "{$attachmentId}.{$extension}";

                $storedPath = $disk->putFileAs($reportStorageDirectory, $file, $filename);

                if ($storedPath === false) {
                    throw new AttachmentStorageException("Failed to store attachment file: {$filename}");
                }

                $savedFilePaths[] = $storedPath;

                // Safely extract dimensions if available
                $realPath = $file->getRealPath();
                $dimensions = $realPath ? ImageDimensionReader::read($realPath) : ['width' => null, 'height' => null];

                // Sanitize original filename (prevent path traversal, length limit)
                $originalName = null;
                if ($file->getClientOriginalName() !== '') {
                    $originalName = Str::substr(basename($file->getClientOriginalName()), 0, 255);
                }

                $attachmentRecords[] = [
                    'id' => $attachmentId,
                    'feedback_report_id' => $reportId,
                    'source' => $source->value,
                    'disk' => $diskName,
                    'path' => $storedPath,
                    'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
                    'extension' => $extension,
                    'size' => $file->getSize() ?: 0,
                    'width' => $dimensions['width'],
                    'height' => $dimensions['height'],
                    'original_filename' => $originalName,
                    'sort_order' => $sortOrder++,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            // 2. Sanitize and prepare metadata
            $maxBytes = (int) config('feedback-reporter.metadata.max_bytes', 262144);
            $maxDepth = max(1, (int) config('feedback-reporter.metadata.max_depth', 10));
            $sanitizedMetadata = MetadataSanitizer::sanitize(
                $validatedData['metadata'] ?? null,
                $request,
                $maxBytes,
                $maxDepth,
            );

            // 3. Database transaction
            /** @var FeedbackReport $feedbackReport */
            $feedbackReport = DB::transaction(function () use (
                $reportId,
                $validatedData,
                $request,
                $sanitizedMetadata,
                $attachmentRecords,
            ): FeedbackReport {
                $report = FeedbackReport::create([
                    'id' => $reportId,
                    'client_report_id' => $validatedData['client_report_id'] ?? null,
                    'user_id' => $request->user()?->getAuthIdentifier(),
                    'message' => $validatedData['message'] ?? null,
                    'page_url' => $validatedData['page_url'] ?? null,
                    'page_title' => $validatedData['page_title'] ?? null,
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'viewport_width' => isset($validatedData['viewport_width']) ? (int) $validatedData['viewport_width'] : null,
                    'viewport_height' => isset($validatedData['viewport_height']) ? (int) $validatedData['viewport_height'] : null,
                    'screen_width' => isset($validatedData['screen_width']) ? (int) $validatedData['screen_width'] : null,
                    'screen_height' => isset($validatedData['screen_height']) ? (int) $validatedData['screen_height'] : null,
                    'locale' => $validatedData['locale'] ?? null,
                    'timezone' => $validatedData['timezone'] ?? null,
                    'metadata' => $sanitizedMetadata,
                ]);

                if (! empty($attachmentRecords)) {
                    FeedbackAttachment::insert($attachmentRecords);
                }

                return $report;
            });

            // Refresh attachments relation on the model
            $feedbackReport->load('attachments');

            // 4. Dispatch Event after DB commit
            FeedbackStored::dispatch($feedbackReport);

            return $feedbackReport;
        } catch (Throwable $e) {
            // Orphan cleanup: remove all saved files from disk to preserve atomicity
            foreach ($savedFilePaths as $filePath) {
                try {
                    $disk->delete($filePath);
                } catch (Throwable) {
                    // Ignore cleanup secondary errors
                }
            }

            throw $e;
        }
    }
}
