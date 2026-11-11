<?php

namespace App\Http\Controllers;

use App\DataObjects\ShopProductData;
use App\Http\Requests\StoreShopProductRequest;
use App\Http\Requests\UpdateShopProductRequest;
use App\Http\Resources\ProductListResource;
use App\Http\Resources\ShopProductResource;
use App\Models\ShopProduct;
use App\Services\ShopProductService;
use App\Support\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use InvalidArgumentException;
use Throwable;

class ShopProductController extends Controller
{
    public function __construct(
        protected ShopProductService $shopProductService
    ) {}

    protected function resolveShopId(Request $request): ?int
    {
        $user = $request->user();
        if ($user && $user->isOwner()) {
            return $user->company_id
                ?: (app()->bound('company') ? (app('company')->id ?? null) : null)
                ?: $user->ownedShop()->value('id');
        }

        $companyId = $request->input('company_id');
        if ($companyId !== null && $companyId !== '') {
            return (int) $companyId;
        }

        return $user?->company_id
            ?: (app()->bound('company') ? (app('company')->id ?? null) : null);
    }

    public function index(Request $request): JsonResponse
    {
        try {
            Gate::authorize('viewAny', ShopProduct::class);

            $shopId = $this->resolveShopId($request);
            if (! $shopId) {
                return ApiResponse::error('Shop identification could not be determined.', 422);
            }

            $perPage = (int) $request->input('per_page', 20);
            $shopProducts = $this->shopProductService->paginate($shopId, $request->all(), $perPage);

            return ApiResponse::success(
                ShopProductResource::collection($shopProducts),
                'Shop listings retrieved successfully'
            );
        } catch (AuthorizationException $e) {
            return ApiResponse::error($e->getMessage() ?: 'Unauthorized.', 403);
        } catch (Throwable $e) {
            app_error_log('SHOP_PRODUCT_INDEX_FAILED', $e);

            return ApiResponse::error('Failed to retrieve shop listings.', 500);
        }
    }

    public function catalog(Request $request): JsonResponse
    {
        try {
            Gate::authorize('viewAny', ShopProduct::class);

            $shopId = $this->resolveShopId($request) ?? 0;
            $perPage = (int) $request->input('per_page', 20);
            $catalog = $this->shopProductService->browseCatalog($shopId, $request->all(), $perPage);

            return ApiResponse::success(
                ProductListResource::collection($catalog),
                'Shared product catalog retrieved successfully'
            );
        } catch (AuthorizationException $e) {
            return ApiResponse::error($e->getMessage() ?: 'Unauthorized.', 403);
        } catch (Throwable $e) {
            app_error_log('SHOP_CATALOG_BROWSE_FAILED', $e);

            return ApiResponse::error('Failed to browse shared catalog.', 500);
        }
    }

    public function store(StoreShopProductRequest $request): JsonResponse
    {
        try {
            Gate::authorize('create', ShopProduct::class);

            $shopId = $this->resolveShopId($request);
            if (! $shopId) {
                return ApiResponse::error('Shop identification could not be determined.', 422);
            }

            $payload = $request->validated();
            $payload['company_id'] = $shopId;

            $dto = ShopProductData::fromArray($payload, $request->file('thumbnail'));
            $shopProduct = $this->shopProductService->assignToShop($dto);

            return ApiResponse::success(
                new ShopProductResource($shopProduct),
                'Product added to your shop listing successfully',
                201
            );
        } catch (AuthorizationException $e) {
            return ApiResponse::error($e->getMessage() ?: 'Unauthorized.', 403);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (ModelNotFoundException $e) {
            return ApiResponse::error('Referenced shop or product was not found.', 404);
        } catch (Throwable $e) {
            app_error_log('SHOP_PRODUCT_STORE_FAILED', $e);

            return ApiResponse::error('Failed to assign product to shop.', 500);
        }
    }

    public function update(UpdateShopProductRequest $request, ShopProduct $shopProduct): JsonResponse
    {
        try {
            Gate::authorize('update', $shopProduct);

            $payload = $request->validated();
            $payload['company_id'] = $shopProduct->company_id;
            $payload['product_id'] = $shopProduct->product_id;

            $dto = ShopProductData::fromArray($payload, $request->file('thumbnail'));
            $updated = $this->shopProductService->update($shopProduct, $dto);

            return ApiResponse::success(
                new ShopProductResource($updated),
                'Shop product overrides updated successfully'
            );
        } catch (AuthorizationException $e) {
            return ApiResponse::error($e->getMessage() ?: 'Unauthorized.', 403);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (Throwable $e) {
            app_error_log('SHOP_PRODUCT_UPDATE_FAILED', $e);

            return ApiResponse::error('Failed to update shop product overrides.', 500);
        }
    }

    public function destroy(ShopProduct $shopProduct): JsonResponse
    {
        try {
            Gate::authorize('delete', $shopProduct);
            $this->shopProductService->delete($shopProduct);

            return ApiResponse::success(null, 'Product removed from your shop successfully');
        } catch (AuthorizationException $e) {
            return ApiResponse::error($e->getMessage() ?: 'Unauthorized.', 403);
        } catch (Throwable $e) {
            app_error_log('SHOP_PRODUCT_DELETE_FAILED', $e);

            return ApiResponse::error('Failed to remove product from shop.', 500);
        }
    }
}
