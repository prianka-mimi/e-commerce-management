<?php

use Illuminate\Support\Facades\Log;

if (! function_exists('app_error_log')) {
    function app_error_log(string $name, Throwable $throwable, string $type = 'info'): void
    {
        Log::{$type}($name, ['message' => $throwable->getMessage(), 'error' => $throwable]);
    }
}
