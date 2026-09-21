<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use TrustMedical\FeedbackReporter\Support\FeedbackAvailabilityChecker;

class FeedbackReporter
{
    /**
     * Indicates if FeedbackReporter default routes will be registered.
     */
    public static bool $registersRoutes = true;

    public function __construct(
        protected FeedbackAvailabilityChecker $checker,
    ) {}

    /**
     * Configure FeedbackReporter to not register its default routes.
     */
    public static function ignoreRoutes(): void
    {
        static::$registersRoutes = false;
    }

    /**
     * Determine if FeedbackReporter routes should be registered.
     */
    public static function shouldRegisterRoutes(): bool
    {
        return static::$registersRoutes && (bool) config('feedback-reporter.route.register', true);
    }

    /**
     * Register FeedbackReporter's routes.
     *
     * @param  (callable(): void)|null  $callback
     * @param  array<string, mixed>  $options
     */
    public static function routes(?callable $callback = null, array $options = []): void
    {
        /** @var array<string, mixed> $defaultOptions */
        $defaultOptions = [
            'prefix' => config('feedback-reporter.route.prefix', 'feedback-reporter'),
            'as' => config('feedback-reporter.route.as', 'feedback-reporter.'),
            'domain' => config('feedback-reporter.route.domain', null),
            'middleware' => config('feedback-reporter.route.middleware', ['web']),
        ];

        /** @var array<string, mixed> $routeConfig */
        $routeConfig = array_merge(
            $defaultOptions,
            array_filter($options, static fn (mixed $value): bool => $value !== null)
        );

        Route::group($routeConfig, function () use ($callback): void {
            if ($callback !== null) {
                $callback();
            } else {
                require __DIR__.'/../routes/web.php';
            }
        });

        app('router')->getRoutes()->refreshNameLookups();
        app('router')->getRoutes()->refreshActionLookups();
    }

    /**
     * Determine if feedback reporter is currently available.
     */
    public function available(?Request $request = null): bool
    {
        return $this->checker->isAvailable($request);
    }

    /**
     * Get the availability checker instance.
     */
    public function checker(): FeedbackAvailabilityChecker
    {
        return $this->checker;
    }
}
