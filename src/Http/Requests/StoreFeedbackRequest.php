<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use TrustMedical\FeedbackReporter\Enums\AttachmentSource;

class StoreFeedbackRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $maxFiles = (int) config('feedback-reporter.attachments.max_files', 5);
        $maxFileSizeKb = (int) config('feedback-reporter.attachments.max_file_size_kb', 5120);

        /** @var array<int, string> $allowedMimes */
        $allowedMimes = config('feedback-reporter.attachments.allowed_mimes', [
            'image/png',
            'image/jpeg',
            'image/webp',
        ]);

        // Convert MIME types to extension list for mimes rule
        $extensions = array_map(function (string $mime): string {
            return match ($mime) {
                'image/png' => 'png',
                'image/jpeg' => 'jpeg,jpg',
                'image/webp' => 'webp',
                'image/gif' => 'gif',
                default => ltrim(strrchr($mime, '/') ?: '', '/'),
            };
        }, $allowedMimes);
        $mimesRule = implode(',', array_filter($extensions));

        return [
            'client_report_id' => ['nullable', 'string', 'max:64', 'unique:feedback_reports,client_report_id'],
            'message' => ['nullable', 'string', 'max:10000'],
            'page_url' => ['nullable', 'string', 'max:2048'],
            'page_title' => ['nullable', 'string', 'max:255'],
            'viewport_width' => ['nullable', 'integer', 'min:0'],
            'viewport_height' => ['nullable', 'integer', 'min:0'],
            'screen_width' => ['nullable', 'integer', 'min:0'],
            'screen_height' => ['nullable', 'integer', 'min:0'],
            'locale' => ['nullable', 'string', 'max:32'],
            'timezone' => ['nullable', 'string', 'max:64'],
            'metadata' => ['nullable'],
            'attachments' => ['nullable', 'array', "max:{$maxFiles}"],
            'attachments.*.file' => [
                'required',
                'file',
                'image',
                "mimes:{$mimesRule}",
                "max:{$maxFileSizeKb}",
            ],
            'attachments.*.source' => [
                'required',
                'string',
                Rule::in(AttachmentSource::values()),
            ],
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $message = $this->input('message');
            /** @var array<mixed>|null $attachments */
            $attachments = $this->file('attachments');

            // 1. Either message or at least one attachment must be present
            $hasMessage = is_string($message) && trim($message) !== '';
            $hasAttachments = is_array($attachments) && count($attachments) > 0;

            if (! $hasMessage && ! $hasAttachments) {
                $validator->errors()->add(
                    'message',
                    'Feedback must contain either a non-empty message or at least one attachment.'
                );
            }

            // 2. Validate total upload size
            if (is_array($attachments)) {
                $maxTotalKb = (int) config('feedback-reporter.attachments.max_total_size_kb', 20480);
                $maxTotalBytes = $maxTotalKb * 1024;
                $totalBytes = 0;

                /** @var array<int, string> $allowedMimes */
                $allowedMimes = config('feedback-reporter.attachments.allowed_mimes', [
                    'image/png',
                    'image/jpeg',
                    'image/webp',
                ]);

                foreach ($attachments as $index => $item) {
                    $file = is_array($item) ? ($item['file'] ?? null) : $item;
                    if ($file instanceof UploadedFile) {
                        $totalBytes += $file->getSize() ?: 0;

                        // Verify real MIME type using finfo / getMimeType
                        $realMime = $file->getMimeType();
                        if ($realMime === null || ! in_array($realMime, $allowedMimes, true)) {
                            $validator->errors()->add(
                                "attachments.{$index}.file",
                                "The attachment MIME type ({$realMime}) is not permitted."
                            );
                        }
                    }
                }

                if ($totalBytes > $maxTotalBytes) {
                    $validator->errors()->add(
                        'attachments',
                        "The total size of all attachments exceeds {$maxTotalKb} KB."
                    );
                }
            }
        });
    }
}
