<?php

declare(strict_types=1);

namespace Workbench\App\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class WorkbenchServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void {}

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Development-only defaults so the Widget is usable without a login screen.
        config([
            'feedback-reporter.enabled' => true,
            'feedback-reporter.availability.environments' => [],
            'feedback-reporter.availability.require_authentication' => false,
        ]);

        $this->loadViewsFrom(__DIR__.'/../../resources/views', 'workbench');

        $packageRoot = dirname(__DIR__, 3);

        Route::middleware('web')->group(function () use ($packageRoot): void {
            Route::get('/', function () {
                return view('workbench::welcome');
            });

            // Serve the built SDK and its Konva dependency to the browser.
            Route::get('/workbench-assets/dist/{path}', fn (string $path) => $this->serveAsset("{$packageRoot}/dist", $path))
                ->where('path', '.*\.js');

            Route::get('/workbench-assets/konva/{path}', fn (string $path) => $this->serveAsset("{$packageRoot}/node_modules/konva/lib", $path))
                ->where('path', '.*\.js');
        });
    }

    /**
     * Serve a JavaScript file from the given directory without allowing traversal outside it.
     */
    protected function serveAsset(string $directory, string $path): BinaryFileResponse
    {
        $root = realpath($directory);
        $file = realpath("{$directory}/{$path}");

        abort_if($root === false || $file === false || ! str_starts_with($file, $root.DIRECTORY_SEPARATOR), 404);

        return response()->file($file, ['Content-Type' => 'text/javascript; charset=utf-8']);
    }
}
