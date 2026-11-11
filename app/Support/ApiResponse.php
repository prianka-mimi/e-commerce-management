<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\Json\ResourceCollection;
use Illuminate\Pagination\LengthAwarePaginator;

final class ApiResponse
{
    public static function success(mixed $data = null, string $message = 'Success', int $code = 200): JsonResponse
    {
        return response()->json([
            'status' => true,
            'status_code' => $code,
            'status_message' => $message,
            'data' => self::transform($data),
        ], $code);
    }

    public static function error(string $message, int $code = 400, mixed $errors = null): JsonResponse
    {
        return response()->json([
            'status' => false,
            'status_code' => $code,
            'status_message' => $message,
            'errors' => $errors,
        ], $code);
    }

    private static function transform(mixed $data): mixed
    {
        return match (true) {
            $data instanceof LengthAwarePaginator => $data->toArray(),
            $data instanceof ResourceCollection => $data->response()->getData(true),
            $data instanceof JsonResource => $data->resolve(),
            default => $data,
        };
    }
}
