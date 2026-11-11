<?php

namespace App\Services;

use App\DataObjects\ShopProductData;
use App\Models\Company;
use App\Models\Product;
use App\Models\ShopProduct;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;
use Throwable;

class ShopProductService
{
    public function __construct(
        protected ImageService $imageService
    ) {}

    /**
     * Browse the master shared product catalog for a given shop.
     * Indicates whether each catalog product is already assigned to this shop.
     */
    public function browseCatalog(int $shopId, array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $query = Product::query()
            ->active()
            ->with(['creator', 'company']);

        if (! empty($filters['name'])) {
            $query->where('name', 'like', '%'.trim($filters['name']).'%');
        }

        $paginator = $query->orderByDesc('id')->paginate($perPage);

        // Check which products in this page are already assigned to this shop
        $productIds = $paginator->pluck('id')->toArray();
        $assignedMap = ShopProduct::where('company_id', $shopId)
            ->whereIn('product_id', $productIds)
            ->pluck('id', 'product_id')
            ->toArray();

        $paginator->getCollection()->transform(function (Product $product) use ($assignedMap) {
            $product->is_assigned = isset($assignedMap[$product->id]);
            $product->shop_product_id = $assignedMap[$product->id] ?? null;

            return $product;
        });

        return $paginator;
    }

    /**
     * Paginate listings specifically assigned to a shop.
     */
    public function paginate(int $shopId, array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $query = ShopProduct::query()
            ->where('company_id', $shopId)
            ->with(['product', 'company']);

        if (! empty($filters['name'])) {
            $name = trim($filters['name']);
            $query->where(function (Builder $q) use ($name) {
                $q->where('name', 'like', "%{$name}%")
                    ->orWhereHas('product', fn (Builder $pq) => $pq->where('name', 'like', "%{$name}%"));
            });
        }

        if (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', (int) $filters['status']);
        }

        return $query->orderByDesc('id')->paginate($perPage);
    }

    public function find(int $id): ShopProduct
    {
        return ShopProduct::with(['product', 'company'])->findOrFail($id);
    }

    /**
     * Assign a shared catalog product to a shop with optional price/thumbnail/details overrides.
     */
    public function assignToShop(ShopProductData $data): ShopProduct
    {
        Company::findOrFail($data->companyId);
        Product::findOrFail($data->productId);

        $exists = ShopProduct::where('company_id', $data->companyId)
            ->where('product_id', $data->productId)
            ->exists();

        if ($exists) {
            throw new InvalidArgumentException('This product is already assigned to this shop.');
        }

        try {
            DB::beginTransaction();

            $thumbnailPath = $this->imageService->resolveMediaValue(
                $data->thumbnail,
                $data->thumbnailUrl,
                null,
                ShopProduct::IMAGE_PATH
            );

            $shopProduct = ShopProduct::create([
                'company_id' => $data->companyId,
                'product_id' => $data->productId,
                'name' => $data->name,
                'price' => $data->price,
                'thumbnail' => $thumbnailPath,
                'description' => $data->description,
                'status' => $data->status,
            ]);

            DB::commit();

            return $shopProduct->load(['product', 'company']);
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Assigning product to shop failed', [
                'shop_id' => $data->companyId,
                'product_id' => $data->productId,
                'exception' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Update shop-specific price, thumbnail, description, or status overrides.
     */
    public function update(ShopProduct $shopProduct, ShopProductData $data): ShopProduct
    {
        try {
            DB::beginTransaction();

            $thumbnailPath = $this->imageService->resolveMediaValue(
                $data->thumbnail,
                $data->thumbnailUrl,
                $shopProduct->thumbnail,
                ShopProduct::IMAGE_PATH
            );

            $shopProduct->update([
                'name' => $data->hasProvided('name') ? $data->name : $shopProduct->name,
                'price' => $data->hasProvided('price') ? $data->price : $shopProduct->price,
                'thumbnail' => $thumbnailPath,
                'description' => $data->hasProvided('description') ? $data->description : $shopProduct->description,
                'status' => $data->hasProvided('status') ? $data->status : $shopProduct->status,
            ]);

            DB::commit();

            return $shopProduct->fresh(['product', 'company']);
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Updating shop product override failed', [
                'id' => $shopProduct->id,
                'exception' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Remove a product from a shop's listings.
     */
    public function delete(ShopProduct $shopProduct): bool
    {
        try {
            DB::beginTransaction();

            if ($shopProduct->thumbnail) {
                $this->imageService->delete($shopProduct->thumbnail);
            }

            $deleted = $shopProduct->delete();

            DB::commit();

            return (bool) $deleted;
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Removing product from shop failed', [
                'id' => $shopProduct->id,
                'exception' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
