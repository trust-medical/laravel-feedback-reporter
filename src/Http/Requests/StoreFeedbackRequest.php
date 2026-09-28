<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Symfony\Component\Mime\MimeTypes;
use TrustMedical\FeedbackReporter\Enums\AttachmentSource;
use TrustMedical\FeedbackReporter\Support\FeedbackLimits;
use TrustMedical\FeedbackReporter\Support\ImageDimensionReader;
use TrustMedical\FeedbackReporter\Support\MetadataSanitizer;

class StoreFeedbackRequest extends FormRequest
{
    /**
     * Upper bound for viewport and screen dimensions.
     */
    private const MAX_DIMENSION = 100000;

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
        $allowedMimes = FeedbackLimits::allowedMimes();

        $fileRules = [
            'required',
            'file',
            'image',
            'max:'.FeedbackLimits::maxFileSizeKb(),
        ];

        // Convert MIME types to an extension list for the mimes rule.
        // With no allowed MIME types, the real MIME check in after() rejects every file.
        $extensions = $this->extensionsFor($allowedMimes);
        if ($extensions !== []) {
            $fileRules[] = 'mimes:'.implode(',', $extensions);
        }

        $dimensionRules = ['nullable', 'integer', 'min:0', 'max:'.self::MAX_DIMENSION];

        return [
            'client_report_id' => ['nullable', 'string', 'regex:/^[A-Za-z0-9_-]{8,64}$/'],
            'message' => ['required', 'string', 'max:'.FeedbackLimits::MAX_MESSAGE_LENGTH],
            'page_url' => ['nullable', 'string', 'max:2048', 'url:http,https'],
            'page_title' => ['nullable', 'string', 'max:255'],
            'viewport_width' => $dimensionRules,
            'viewport_height' => $dimensionRules,
            'screen_width' => $dimensionRules,
            'screen_height' => $dimensionRules,
            'locale' => ['nullable', 'string', 'max:32'],
            'timezone' => ['nullable', 'string', 'max:64', 'timezone:all'],
            'metadata' => ['nullable'],
            'attachments' => ['nullable', 'array', 'max:'.FeedbackLimits::maxFiles()],
            'attachments.*.file' => $fileRules,
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

            if (is_string($message) && trim($message) === '') {
                $validator->errors()->add(
                    'message',
                    'The feedback message must not be blank.'
                );
            }

            $metadataError = MetadataSanitizer::validate(
                $this->input('metadata'),
                FeedbackLimits::maxMetadataBytes(),
                FeedbackLimits::maxMetadataDepth(),
            );
            if ($metadataError !== null) {
                $validator->errors()->add('metadata', $metadataError);
            }

            if (is_array($attachments)) {
                $this->validateAttachments($validator, $attachments);
            }
        });
    }

    /**
     * Validate real MIME types, pixel counts, and the combined size of attachments.
     *
     * @param  array<mixed>  $attachments
     */
    private function validateAttachments(Validator $validator, array $attachments): void
    {
        $maxTotalKb = FeedbackLimits::maxTotalSizeKb();
        $allowedMimes = FeedbackLimits::allowedMimes();
        $maxPixels = FeedbackLimits::maxPixels();
        $totalBytes = 0;

        foreach ($attachments as $index => $item) {
            $file = is_array($item) ? ($item['file'] ?? null) : $item;
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $totalBytes += $file->getSize() ?: 0;

            // Verify real MIME type using finfo / getMimeType
            $realMime = $file->getMimeType();
            if ($realMime === null || ! in_array($realMime, $allowedMimes, true)) {
                $validator->errors()->add(
                    "attachments.{$index}.file",
                    "The attachment MIME type ({$realMime}) is not permitted."
                );

                continue;
            }

            if ($maxPixels !== null) {
                $realPath = $file->getRealPath();
                $dimensions = $realPath ? ImageDimensionReader::read($realPath) : ['width' => null, 'height' => null];

                if ($dimensions['width'] !== null && $dimensions['height'] !== null
                    && $maxPixels < $dimensions['width'] * $dimensions['height']) {
                    $validator->errors()->add(
                        "attachments.{$index}.file",
                        "The attachment exceeds the maximum of {$maxPixels} pixels."
                    );
                }
            }
        }

        if ($totalBytes > $maxTotalKb * 1024) {
            $validator->errors()->add(
                'attachments',
                "The total size of all attachments exceeds {$maxTotalKb} KB."
            );
        }
    }

    /**
     * Resolve file extensions for the given MIME types.
     *
     * @param  array<int, string>  $mimes
     * @return array<int, string>
     */
    private function extensionsFor(array $mimes): array
    {
        $extensions = [];
        foreach ($mimes as $mime) {
            foreach (MimeTypes::getDefault()->getExtensions($mime) as $extension) {
                $extensions[] = $extension;
            }
        }

        return array_values(array_unique($extensions));
    }
}
