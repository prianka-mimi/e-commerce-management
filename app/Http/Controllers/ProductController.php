<?php

namespace App\Http\Controllers;

use App\DataObjects\ProductData;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductDetailResource;
use App\Http\Resources\ProductListResource;
use App\Models\Product;
use App\Services\ProductService;
use App\Support\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use InvalidArgumentException;
use Throwable;

class ProductController extends Controller
{
    public function __construct(
        protected ProductService $productService
    ) {}

    public function index(Request $request): JsonResponse
    {
        try {
            Gate::authorize('viewAny', Product::class);
            $perPage = (int) $request->input('per_page', 20);
            $products = $this->productService->paginate($request->all(), $perPage);

            return ApiResponse::success(
                ProductListResource::collection($products),
                'Products retrieved successfully'
            );
        } catch (AuthorizationException $e) {
            return ApiResponse::error($e->getMessage() ?: 'Unauthorized.', 403);
        } catch (Throwable $e) {
            app_error_log('PRODUCT_FETCH_FAILED', $e);

            return ApiResponse::error('Failed to retrieve products.', 500);
        }
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        try {
            Gate::authorize('create', Product::class);

            $user = $request->user();
            $payload = $request->validated();
            $payload['created_by'] = $user?->id;

            if ($user && $user->isOwner()) {
                $ownerShopId = $user->company_id ?: ($user->ownedShop()->value('id') ?? null);
                $payload['company_id'] = ! empty($payload['company_id']) ? $ownerShopId : null;
            }

            $dto = ProductData::fromArray($payload, $request->file('photo'));
            $product = $this->productService->create($dto);

            return ApiResponse::success(
                new ProductDetailResource($product),
                'Product created in shared catalog successfully',
                201
            );
        } catch (AuthorizationException $e) {
            return ApiResponse::error($e->getMessage() ?: 'Unauthorized.', 403);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (Throwable $e) {
            app_error_log('PRODUCT_STORE_FAILED', $e);

            return ApiResponse::error('Failed to create product in catalog.', 500);
        }
    }

    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        try {
            Gate::authorize('update', $product);

            $dto = ProductData::fromArray(
                $request->validated(),
                $request->file('photo')
            );

            $updated = $this->productService->update($product, $dto);

            return ApiResponse::success(
                new ProductDetailResource($updated),
                'Product updated successfully'
            );
        } catch (AuthorizationException $e) {
            return ApiResponse::error($e->getMessage() ?: 'Unauthorized.', 403);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (Throwable $e) {
            app_error_log('PRODUCT_UPDATE_FAILED', $e);

            return ApiResponse::error('Failed to update product.', 500);
        }
    }

    public function destroy(Product $product): JsonResponse
    {
        try {
            Gate::authorize('delete', $product);
            $this->productService->delete($product);

            return ApiResponse::success(null, 'Product deleted successfully');
        } catch (AuthorizationException $e) {
            return ApiResponse::error($e->getMessage() ?: 'Unauthorized.', 403);
        } catch (Throwable $e) {
            app_error_log('PRODUCT_DELETE_FAILED', $e);

            return ApiResponse::error('Failed to delete product.', 500);
        }
    }
}
