<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('feedback_attachments')
            ->where('source', 'automatic_capture')
            ->update(['source' => 'user_screenshot']);
    }

    /**
     * Reverse the migrations.
     *
     * This normalization is intentionally irreversible because existing manual
     * screenshots cannot be distinguished from migrated automatic captures.
     */
    public function down(): void
    {
        //
    }
};
