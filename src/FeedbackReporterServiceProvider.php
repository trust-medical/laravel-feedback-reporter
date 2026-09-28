<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use TrustMedical\FeedbackReporter\Support\FeedbackAvailabilityChecker;

class FeedbackReporterServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->mergeConfigFrom(
            __DIR__.'/../config/feedback-reporter.php',
            'feedback-reporter'
        );

        $this->app->singleton(FeedbackAvailabilityChecker::class, function (): FeedbackAvailabilityChecker {
            return new FeedbackAvailabilityChecker;
        });

        $this->app->singleton(FeedbackReporter::class, function ($app): FeedbackReporter {
            return new FeedbackReporter($app->make(FeedbackAvailabilityChecker::class));
        });

        $this->app->alias(FeedbackReporter::class, 'feedback-reporter');
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configurePublishing();
        $this->configureRateLimiting();
        $this->configureRoutes();
        $this->configureMigrations();
    }

    /**
     * Configure publishing for the package.
     */
    protected function configurePublishing(): void
    {
        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__.'/../config/feedback-reporter.php' => config_path('feedback-reporter.php'),
            ], 'feedback-reporter-config');

            $this->publishes([
                __DIR__.'/../database/migrations' => database_path('migrations'),
            ], 'feedback-reporter-migrations');
        }
    }

    /**
     * Configure the rate limiter for the feedback reporter routes.
     */
    protected function configureRateLimiting(): void
    {
        RateLimiter::for('feedback-reporter', function (Request $request): Limit {
            $maxAttempts = (int) config('feedback-reporter.rate_limit.max_attempts', 10);
            $decayMinutes = (int) config('feedback-reporter.rate_limit.decay_minutes', 1);

            return Limit::perMinutes($decayMinutes, $maxAttempts)->by($this->rateLimitKey($request));
        });

        RateLimiter::for('feedback-reporter-availability', function (Request $request): Limit {
            $maxAttempts = (int) config('feedback-reporter.rate_limit.availability_max_attempts', 60);
            $decayMinutes = (int) config('feedback-reporter.rate_limit.availability_decay_minutes', 1);

            return Limit::perMinutes($decayMinutes, $maxAttempts)->by($this->rateLimitKey($request));
        });
    }

    /**
     * Resolve the rate limiter key for the given request.
     */
    protected function rateLimitKey(Request $request): string
    {
        return (string) ($request->user()?->getAuthIdentifier() ?? $request->ip() ?? 'anonymous');
    }

    /**
     * Configure the routes offered by the package.
     */
    protected function configureRoutes(): void
    {
        if (! FeedbackReporter::shouldRegisterRoutes()) {
            return;
        }

        FeedbackReporter::routes();
    }

    /**
     * Configure migrations for the package.
     */
    protected function configureMigrations(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');
    }
}
