<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Support;

use Illuminate\Http\Request;
use InvalidArgumentException;
use Throwable;

final class MetadataSanitizer
{
    /**
     * Sanitize and validate client metadata, and append server-derived context.
     *
     * @param  int<1, max>  $maxDepth
     * @return array<string, mixed>
     */
    public static function sanitize(mixed $rawMetadata, Request $request, int $maxBytes = 262144, int $maxDepth = 10): array
    {
        $metadata = [];
        $depth = max(1, $maxDepth);

        if (is_string($rawMetadata)) {
            if (strlen($rawMetadata) > $maxBytes) {
                throw new InvalidArgumentException("Metadata payload exceeds maximum size of {$maxBytes} bytes.");
            }

            try {
                $decoded = json_decode($rawMetadata, true, $depth, JSON_THROW_ON_ERROR);
                if (is_array($decoded)) {
                    $metadata = $decoded;
                }
            } catch (Throwable $e) {
                throw new InvalidArgumentException('Invalid metadata JSON structure: '.$e->getMessage(), 0, $e);
            }
        } elseif (is_array($rawMetadata)) {
            $encoded = json_encode($rawMetadata);
            if ($encoded !== false && strlen($encoded) > $maxBytes) {
                throw new InvalidArgumentException("Metadata payload exceeds maximum size of {$maxBytes} bytes.");
            }
            if (self::getDepth($rawMetadata) > $maxDepth) {
                throw new InvalidArgumentException("Metadata nesting depth exceeds maximum allowed depth of {$maxDepth}.");
            }
            $metadata = $rawMetadata;
        }

        // Inject server context safely (server context always wins on collision)
        $metadata['server'] = self::buildServerContext($request);

        return $metadata;
    }

    /**
     * Calculate array nesting depth.
     *
     * @param  array<mixed>  $array
     */
    private static function getDepth(array $array): int
    {
        $maxDepth = 1;
        foreach ($array as $value) {
            if (is_array($value)) {
                $depth = self::getDepth($value) + 1;
                if ($depth > $maxDepth) {
                    $maxDepth = $depth;
                }
            }
        }

        return $maxDepth;
    }

    /**
     * Build safe server context attributes.
     *
     * @return array<string, mixed>
     */
    private static function buildServerContext(Request $request): array
    {
        $server = [
            'received_at' => now()->toIso8601String(),
            'ip_address' => $request->ip(),
            'http_method' => $request->method(),
            'host' => $request->getHost(),
            'server_route' => $request->route()?->getName(),
            'authenticated_user_id' => $request->user()?->getAuthIdentifier(),
        ];

        if (config('feedback-reporter.server_context.capture_environment', true)) {
            $server['environment'] = app()->environment();
        }

        if (config('feedback-reporter.server_context.capture_laravel_version', true)) {
            $server['laravel_version'] = app()->version();
        }

        if (config('feedback-reporter.server_context.capture_php_version', true)) {
            $server['php_version'] = PHP_VERSION;
        }

        return $server;
    }
}
