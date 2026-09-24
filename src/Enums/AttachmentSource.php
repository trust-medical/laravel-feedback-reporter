<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Enums;

enum AttachmentSource: string
{
    case UserScreenshot = 'user_screenshot';
    case Attachment = 'attachment';

    /**
     * Get all possible enum values.
     *
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
