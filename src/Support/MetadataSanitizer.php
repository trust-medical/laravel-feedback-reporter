<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Support;

use Illuminate\Http\Request;
use InvalidArgumentException;
use Throwable;

final class MetadataSanitizer
{
    /**
     * Validate client metadata against size, depth, and encoding limits.
     *
     * Returns an error message when the payload is invalid, or null when it is acceptable.
     */
    public static function validate(mixed $rawMetadata, int $maxBytes = 262144, int $maxDepth = 10): ?string
    {
        try {
            self::decode($rawMetadata, $maxBytes, max(1, $maxDepth));
        } catch (InvalidArgumentException $e) {
            return $e->getMessage();
        }

        return null;
    }

    /**
     * Sanitize and validate client metadata, and append server-derived context.
     *
     * @param  int<1, max>  $maxDepth
     * @return array<string, mixed>
     *
     * @throws InvalidArgumentException
     */
    public static function sanitize(mixed $rawMetadata, Request $request, int $maxBytes = 262144, int $maxDepth = 10): array
    {
        $metadata = self::decode($rawMetadata, $maxBytes, max(1, $maxDepth));

        // Inject server context safely (server context always wins on collision)
        $metadata['server'] = self::buildServerContext($request);

        return $metadata;
    }

    /**
     * Decode client metadata into an array, enforcing size, depth, and encoding limits.
     *
     * @param  int<1, max>  $maxDepth
     * @return array<string, mixed>
     *
     * @throws InvalidArgumentException
     */
    private static function decode(mixed $rawMetadata, int $maxBytes, int $maxDepth): array
    {
        if ($rawMetadata === null || $rawMetadata === '') {
            return [];
        }

        if (is_string($rawMetadata)) {
            if (strlen($rawMetadata) > $maxBytes) {
                throw new InvalidArgumentException("The metadata payload exceeds the maximum size of {$maxBytes} bytes.");
            }

            try {
                // json_decode depth counts the outermost container, so allow one extra level for scalars
                $decoded = json_decode($rawMetadata, true, $maxDepth + 1, JSON_THROW_ON_ERROR);
            } catch (Throwable) {
                throw new InvalidArgumentException("The metadata must be valid JSON no deeper than {$maxDepth} levels.");
            }

            if (! is_array($decoded)) {
                throw new InvalidArgumentException('The metadata must be a JSON object.');
            }

            $rawMetadata = $decoded;
        }

        if (! is_array($rawMetadata)) {
            throw new InvalidArgumentException('The metadata must be a JSON object.');
        }

        $encoded = json_encode($rawMetadata);
        if ($encoded === false) {
            throw new InvalidArgumentException('The metadata must be encodable as UTF-8 JSON.');
        }

        if (strlen($encoded) > $maxBytes) {
            throw new InvalidArgumentException("The metadata payload exceeds the maximum size of {$maxBytes} bytes.");
        }

        if (self::getDepth($rawMetadata) > $maxDepth) {
            throw new InvalidArgumentException("The metadata nesting depth exceeds the maximum of {$maxDepth} levels.");
        }

        /** @var array<string, mixed> $rawMetadata */
        return $rawMetadata;
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
