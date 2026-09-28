<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Support;

final class FeedbackLimits
{
    /**
     * Maximum length of the feedback message in characters.
     */
    public const MAX_MESSAGE_LENGTH = 10000;

    /**
     * Maximum number of attachments per report.
     */
    public static function maxFiles(): int
    {
        return max(0, (int) config('feedback-reporter.attachments.max_files', 5));
    }

    /**
     * Maximum size of a single attachment in kilobytes.
     */
    public static function maxFileSizeKb(): int
    {
        return max(1, (int) config('feedback-reporter.attachments.max_file_size_kb', 5120));
    }

    /**
     * Maximum combined size of all attachments in kilobytes.
     */
    public static function maxTotalSizeKb(): int
    {
        return max(1, (int) config('feedback-reporter.attachments.max_total_size_kb', 20480));
    }

    /**
     * Allowed real MIME types for attachments.
     *
     * @return array<int, string>
     */
    public static function allowedMimes(): array
    {
        $mimes = config('feedback-reporter.attachments.allowed_mimes', [
            'image/png',
            'image/jpeg',
            'image/webp',
        ]);

        if (! is_array($mimes)) {
            return [];
        }

        return array_values(array_filter($mimes, static fn (mixed $mime): bool => is_string($mime) && $mime !== ''));
    }

    /**
     * Maximum number of pixels (width × height) per image, or null when unlimited.
     */
    public static function maxPixels(): ?int
    {
        $maxPixels = config('feedback-reporter.attachments.max_pixels', 40000000);

        return $maxPixels === null ? null : max(1, (int) $maxPixels);
    }

    /**
     * Maximum encoded metadata size in bytes.
     */
    public static function maxMetadataBytes(): int
    {
        return max(1, (int) config('feedback-reporter.metadata.max_bytes', 262144));
    }

    /**
     * Maximum metadata nesting depth.
     *
     * @return int<1, max>
     */
    public static function maxMetadataDepth(): int
    {
        return max(1, (int) config('feedback-reporter.metadata.max_depth', 10));
    }

    /**
     * Limits exposed to clients through the availability endpoint.
     *
     * @return array<string, mixed>
     */
    public static function toArray(): array
    {
        return [
            'max_files' => self::maxFiles(),
            'max_file_size_kb' => self::maxFileSizeKb(),
            'max_total_size_kb' => self::maxTotalSizeKb(),
            'allowed_mimes' => self::allowedMimes(),
            'max_message_length' => self::MAX_MESSAGE_LENGTH,
            'max_metadata_bytes' => self::maxMetadataBytes(),
            'max_metadata_depth' => self::maxMetadataDepth(),
        ];
    }
}
