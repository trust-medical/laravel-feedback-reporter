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
        Schema::create('feedback_attachments', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('feedback_report_id')
                ->constrained('feedback_reports')
                ->cascadeOnDelete();

            $table->string('source', 32);
            $table->string('disk', 64);
            $table->string('path');

            $table->string('mime_type', 128);
            $table->string('extension', 16);
            $table->unsignedBigInteger('size');

            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();

            $table->string('original_filename')->nullable();
            $table->unsignedInteger('sort_order')->default(0);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('feedback_attachments');
    }
};
