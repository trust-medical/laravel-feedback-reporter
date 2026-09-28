<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('feedback_reports', function (Blueprint $table): void {
            // Supports retention pruning and chronological listings
            $table->index('created_at');
        });

        Schema::table('feedback_attachments', function (Blueprint $table): void {
            // Some databases, such as PostgreSQL, do not index foreign keys automatically
            $table->index(['feedback_report_id', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('feedback_attachments', function (Blueprint $table): void {
            $table->dropIndex(['feedback_report_id', 'sort_order']);
        });

        Schema::table('feedback_reports', function (Blueprint $table): void {
            $table->dropIndex(['created_at']);
        });
    }
};
