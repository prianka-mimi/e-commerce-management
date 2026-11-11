<?php

namespace App\Http\Controllers;

use App\Services\AdminOverviewService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Throwable;

class AdminOverviewController extends Controller
{
    public function __construct(
        protected AdminOverviewService $overviewService
    ) {}

    public function index(): JsonResponse
    {
        try {
            $data = $this->overviewService->getOverviewData();

            return ApiResponse::success(
                $data,
                'Admin overview data retrieved successfully'
            );
        } catch (Throwable $e) {
            app_error_log('ADMIN_OVERVIEW_FAILED', $e);

            return ApiResponse::error('Failed to compile admin overview data.', 500);
        }
    }
}
