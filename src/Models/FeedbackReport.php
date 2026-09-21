<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string|null $client_report_id
 * @property string|null $user_id
 * @property string|null $message
 * @property string|null $page_url
 * @property string|null $page_title
 * @property string|null $ip_address
 * @property string|null $user_agent
 * @property int|null $viewport_width
 * @property int|null $viewport_height
 * @property int|null $screen_width
 * @property int|null $screen_height
 * @property string|null $locale
 * @property string|null $timezone
 * @property array<string, mixed>|null $metadata
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, FeedbackAttachment> $attachments
 */
class FeedbackReport extends Model
{
    use HasUlids;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'feedback_reports';

    /**
     * The attributes that aren't mass assignable.
     *
     * @var array<int, string>
     */
    protected $guarded = [];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'viewport_width' => 'integer',
        'viewport_height' => 'integer',
        'screen_width' => 'integer',
        'screen_height' => 'integer',
        'metadata' => 'array',
    ];

    /**
     * Get the attachments for the feedback report.
     *
     * @return HasMany<FeedbackAttachment, $this>
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(FeedbackAttachment::class, 'feedback_report_id', 'id')
            ->orderBy('sort_order');
    }
}
