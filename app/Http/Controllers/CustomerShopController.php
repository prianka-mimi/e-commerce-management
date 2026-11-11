<?php

namespace App\Http\Controllers;

use App\Http\Resources\CompanyResource;
use App\Http\Resources\CustomerShopProductResource;
use App\Services\CustomerStorefrontService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class CustomerShopController extends Controller
{
    public function __construct(
        protected CustomerStorefrontService $storefrontService
    ) {}

    public function shops(Request $request): JsonResponse
    {
        try {
            $perPage = (int) $request->input('per_page', 20);
            $shops = $this->storefrontService->getActiveShops($request->all(), $perPage);

            return ApiResponse::success(
                CompanyResource::collection($shops),
                'Shops retrieved successfully'
            );
        } catch (Throwable $e) {
            app_error_log('CUSTOMER_SHOPS_FETCH_FAILED', $e);

            return ApiResponse::error('Failed to retrieve shops.', 500);
        }
    }

    public function shopDetail(int $companyId): JsonResponse
    {
        try {
            $shop = $this->storefrontService->getShopDetail($companyId);

            return ApiResponse::success(
                new CompanyResource($shop),
                'Shop details retrieved successfully'
            );
        } catch (Throwable $e) {
            app_error_log('CUSTOMER_SHOP_DETAIL_FAILED', $e);

            return ApiResponse::error('Shop not found or inactive.', 404);
        }
    }

    public function shopProducts(Request $request, int $companyId): JsonResponse
    {
        try {
            $perPage = (int) $request->input('per_page', 20);
            $products = $this->storefrontService->getShopProducts($companyId, $request->all(), $perPage);

            return ApiResponse::success(
                CustomerShopProductResource::collection($products),
                'Shop products retrieved successfully'
            );
        } catch (Throwable $e) {
            app_error_log('CUSTOMER_SHOP_PRODUCTS_FETCH_FAILED', $e);

            return ApiResponse::error('Failed to retrieve shop products.', 500);
        }
    }

    public function showShopProduct(int $companyId, int $shopProductId): JsonResponse
    {
        try {
            $shopProduct = $this->storefrontService->getShopProduct($companyId, $shopProductId);

            return ApiResponse::success(
                new CustomerShopProductResource($shopProduct),
                'Product details retrieved successfully'
            );
        } catch (Throwable $e) {
            app_error_log('CUSTOMER_SHOP_PRODUCT_SHOW_FAILED', $e);

            return ApiResponse::error('Product not found in this shop.', 404);
        }
    }

    public function featuredProducts(Request $request): JsonResponse
    {
        try {
            $perPage = (int) ($request->input('limit') ?? $request->input('per_page') ?? 20);
            $featured = $this->storefrontService->getFeaturedProducts($request->all(), $perPage);

            return ApiResponse::success(
                CustomerShopProductResource::collection($featured),
                'Featured shop products retrieved successfully'
            );
        } catch (Throwable $e) {
            app_error_log('CUSTOMER_FEATURED_PRODUCTS_FAILED', $e);

            return ApiResponse::error('Failed to retrieve featured products.', 500);
        }
    }
}
