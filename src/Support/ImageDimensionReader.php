<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Support;

use Throwable;

final class ImageDimensionReader
{
    /**
     * Safely read image dimensions without loading full image into memory.
     *
     * @return array{width: int|null, height: int|null}
     */
    public static function read(string $filePath): array
    {
        if (! file_exists($filePath) || ! is_readable($filePath)) {
            return ['width' => null, 'height' => null];
        }

        try {
            // Suppress warnings for corrupted/invalid headers
            $info = @getimagesize($filePath);

            if ($info === false) {
                return ['width' => null, 'height' => null];
            }

            return [
                'width' => (int) $info[0],
                'height' => (int) $info[1],
            ];
        } catch (Throwable) {
            return ['width' => null, 'height' => null];
        }
    }
}
