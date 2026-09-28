<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Actions;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;
use TrustMedical\FeedbackReporter\Enums\AttachmentSource;
use TrustMedical\FeedbackReporter\Events\FeedbackStored;
use TrustMedical\FeedbackReporter\Exceptions\AttachmentStorageException;
use TrustMedical\FeedbackReporter\Models\FeedbackAttachment;
use TrustMedical\FeedbackReporter\Models\FeedbackReport;
use TrustMedical\FeedbackReporter\Support\FeedbackLimits;
use TrustMedical\FeedbackReporter\Support\ImageDimensionReader;
use TrustMedical\FeedbackReporter\Support\MetadataSanitizer;

class StoreFeedbackReport
{
    /**
     * Maximum stored length of the User-Agent header.
     */
    private const MAX_USER_AGENT_LENGTH = 1024;

    /**
     * Store the feedback report and its attachments with all-or-nothing atomicity.
     *
     * @param  array<string, mixed>  $validatedData
     *
     * @throws AttachmentStorageException|ValidationException|Throwable
     */
    public function execute(array $validatedData, Request $request): FeedbackReport
    {
        return $this->handle($validatedData, $request)->report;
    }

    /**
     * Store the feedback report, or return the existing report for a repeated client_report_id.
     *
     * @param  array<string, mixed>  $validatedData
     *
     * @throws AttachmentStorageException|ValidationException|Throwable
     */
    public function handle(array $validatedData, Request $request): StoredFeedbackResult
    {
        $clientReportId = isset($validatedData['client_report_id']) ? (string) $validatedData['client_report_id'] : null;

        // Idempotent replay: return the existing report before writing anything
        if ($clientReportId !== null && ($existing = $this->findExisting($clientReportId, $request)) !== null) {
            return new StoredFeedbackResult($existing, false);
        }

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
            // 1. Sanitize and prepare metadata
            $sanitizedMetadata = MetadataSanitizer::sanitize(
                $validatedData['metadata'] ?? null,
                $request,
                FeedbackLimits::maxMetadataBytes(),
                FeedbackLimits::maxMetadataDepth(),
            );

            // 2. Save all attachment files to the configured storage disk
            $sortOrder = 0;
            foreach ($rawAttachments as $attachmentItem) {
                /** @var UploadedFile $file */
                $file = $attachmentItem['file'];
                $source = $attachmentItem['source'] instanceof AttachmentSource
                    ? $attachmentItem['source']
                    : AttachmentSource::from((string) $attachmentItem['source']);

                $attachmentId = (string) Str::ulid();
                $extension = Str::substr(strtolower($file->guessExtension() ?: 'bin'), 0, 16);
                $filename = "{$attachmentId}.{$extension}";

                $storedPath = $disk->putFileAs($reportStorageDirectory, $file, $filename, ['visibility' => 'private']);

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

            // 3. Database transaction
            /** @var FeedbackReport $feedbackReport */
            $feedbackReport = DB::transaction(function () use (
                $reportId,
                $clientReportId,
                $validatedData,
                $request,
                $sanitizedMetadata,
                $attachmentRecords,
            ): FeedbackReport {
                $userAgent = $request->userAgent();

                $report = FeedbackReport::create([
                    'id' => $reportId,
                    'client_report_id' => $clientReportId,
                    'user_id' => $request->user()?->getAuthIdentifier(),
                    'message' => $validatedData['message'] ?? null,
                    'page_url' => $validatedData['page_url'] ?? null,
                    'page_title' => $validatedData['page_title'] ?? null,
                    'ip_address' => $request->ip(),
                    'user_agent' => $userAgent !== null ? Str::substr($userAgent, 0, self::MAX_USER_AGENT_LENGTH) : null,
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
        } catch (UniqueConstraintViolationException $e) {
            // A concurrent request with the same client_report_id won the race
            $this->cleanup($disk, $savedFilePaths, $reportStorageDirectory);

            $existing = $clientReportId !== null ? $this->findExisting($clientReportId, $request) : null;
            if ($existing === null) {
                throw $e;
            }

            return new StoredFeedbackResult($existing, false);
        } catch (Throwable $e) {
            // Orphan cleanup: remove all saved files from disk to preserve atomicity
            $this->cleanup($disk, $savedFilePaths, $reportStorageDirectory);

            throw $e;
        }

        // The report is committed from here on; failures below must not remove its files.
        $feedbackReport->load('attachments');

        // 4. Dispatch the event (deferred until the outermost transaction commits)
        FeedbackStored::dispatch($feedbackReport);

        return new StoredFeedbackResult($feedbackReport, true);
    }

    /**
     * Find a report previously stored with the same client_report_id by the same submitter.
     *
     * @throws ValidationException When the key belongs to another submitter.
     */
    protected function findExisting(string $clientReportId, Request $request): ?FeedbackReport
    {
        $existing = FeedbackReport::query()->where('client_report_id', $clientReportId)->first();

        if ($existing === null) {
            return null;
        }

        $userId = $request->user()?->getAuthIdentifier();

        $sameSubmitter = $userId !== null
            ? $existing->user_id === (string) $userId
            : $existing->user_id === null && $existing->ip_address === $request->ip();

        if (! $sameSubmitter) {
            throw ValidationException::withMessages([
                'client_report_id' => __('validation.unique', ['attribute' => 'client report id']),
            ]);
        }

        return $existing->load('attachments');
    }

    /**
     * Remove files written for a report that was not committed.
     *
     * @param  array<int, string>  $savedFilePaths
     */
    private function cleanup(Filesystem $disk, array $savedFilePaths, string $reportStorageDirectory): void
    {
        foreach ($savedFilePaths as $filePath) {
            try {
                $disk->delete($filePath);
            } catch (Throwable) {
                // Ignore cleanup secondary errors
            }
        }

        if ($savedFilePaths !== []) {
            try {
                $disk->deleteDirectory($reportStorageDirectory);
            } catch (Throwable) {
                // Ignore cleanup secondary errors
            }
        }
    }
}
