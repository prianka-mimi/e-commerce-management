<?php

namespace App\Providers;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Pagination\Paginator;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    final public function boot(): void
    {
        JsonResource::withoutWrapping();
        Paginator::useBootstrapFive();

        Gate::before(static function ($user, $ability) {
            if ($user->hasRole('Admin')) {
                return true;
            }

            return null;
        });

        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }
    }
}
