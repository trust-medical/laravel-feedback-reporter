<?php

declare(strict_types=1);

namespace TrustMedical\FeedbackReporter\Tests;

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Orchestra\Testbench\TestCase as OrchestraTestCase;
use TrustMedical\FeedbackReporter\FeedbackReporterServiceProvider;

abstract class TestCase extends OrchestraTestCase
{
    use RefreshDatabase;

    /**
     * Get package providers.
     *
     * @param  Application  $app
     * @return array<int, class-string>
     */
    protected function getPackageProviders($app): array
    {
        return [
            FeedbackReporterServiceProvider::class,
        ];
    }

    /**
     * Define database migrations.
     */
    protected function defineDatabaseMigrations(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');
    }

    /**
     * Define environment setup.
     *
     * @param  Application  $app
     */
    protected function defineEnvironment($app): void
    {
        // Setup app key for encryption and session middleware
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));

        // Keep rate limiter state in memory, independent of any Workbench .env
        $app['config']->set('cache.default', 'array');

        // Setup default database to use sqlite :memory:
        $app['config']->set('database.default', 'testbench');
        $app['config']->set('database.connections.testbench', [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
        ]);

        // Default test configuration
        $app['config']->set('feedback-reporter.enabled', true);
        $app['config']->set('feedback-reporter.availability.environments', ['testing']);
        $app['config']->set('feedback-reporter.availability.require_authentication', false);
        $app['config']->set('feedback-reporter.storage.disk', 'local');
        $app['config']->set('feedback-reporter.storage.path', 'feedback-reports-test');
    }
}
