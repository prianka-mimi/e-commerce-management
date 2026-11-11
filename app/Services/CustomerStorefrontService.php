<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Product;
use App\Models\ShopProduct;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class CustomerStorefrontService
{
    /**
     * List active certified shops with active listing counts and preview products.
     */
    public function getActiveShops(array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $query = Company::query()
            ->active()
            ->withCount(['shopProducts' => fn ($q) => $q->active()])
            ->with(['shopProducts' => function ($q) {
                $q->active()->with('product')->latest()->limit(4);
            }]);

        if (! empty($filters['company_id'])) {
            $query->where('id', (int) $filters['company_id']);
        }

        if (! empty($filters['search'])) {
            $term = trim($filters['search']);
            $query->where(function (Builder $q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('sort_description', 'like', "%{$term}%")
                    ->orWhere('description', 'like', "%{$term}%");
            });
        }

        return $query->orderByDesc('is_default')->orderBy('name')->paginate($perPage);
    }

    /**
     * Get single shop details with its active product count.
     */
    public function getShopDetail(int $companyId): Company
    {
        return Company::query()
            ->active()
            ->withCount(['shopProducts' => fn ($q) => $q->active()])
            ->findOrFail($companyId);
    }

    /**
     * Get products assigned to a specific shop.
     * STRICT REQUIREMENT: Only products assigned to this shop are returned, with shop-specific overrides.
     */
    public function getShopProducts(int $companyId, array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $query = ShopProduct::query()
            ->where('company_id', $companyId)
            ->active()
            ->whereHas('product', fn ($q) => $q->where('status', Product::STATUS_ACTIVE))
            ->whereHas('company', fn ($q) => $q->where('status', Company::STATUS_ACTIVE))
            ->with(['product', 'company']);

        if (! empty($filters['company_id'])) {
            $query->where('company_id', (int) $filters['company_id']);
        }

        if (! empty($filters['search'])) {
            $term = trim($filters['search']);
            $query->where(function (Builder $q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('description', 'like', "%{$term}%")
                    ->orWhereHas('product', function (Builder $pq) use ($term) {
                        $pq->where('name', 'like', "%{$term}%")
                            ->orWhere('sku', 'like', "%{$term}%")
                            ->orWhere('description', 'like', "%{$term}%");
                    });
            });
        }

        return $query->orderByDesc('id')->paginate($perPage);
    }

    /**
     * Get a single shop-specific product listing.
     */
    public function getShopProduct(int $companyId, int $shopProductId): ShopProduct
    {
        return ShopProduct::query()
            ->where('company_id', $companyId)
            ->where(function (Builder $q) use ($shopProductId) {
                $q->where('id', $shopProductId)
                    ->orWhere('product_id', $shopProductId);
            })
            ->active()
            ->whereHas('company', fn ($q) => $q->where('status', Company::STATUS_ACTIVE))
            ->whereHas('product', fn ($q) => $q->where('status', Product::STATUS_ACTIVE))
            ->with(['product', 'company'])
            ->firstOrFail();
    }

    /**
     * Featured products across all active shops.
     * STRICT REQUIREMENT: Only products assigned to active shops are displayed.
     */
    public function getFeaturedProducts(array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $query = ShopProduct::query()
            ->active()
            ->whereHas('company', fn ($q) => $q->where('status', Company::STATUS_ACTIVE))
            ->whereHas('product', fn ($q) => $q->where('status', Product::STATUS_ACTIVE))
            ->with(['product', 'company']);

        if (! empty($filters['company_id'])) {
            $query->where('company_id', (int) $filters['company_id']);
        }

        if (! empty($filters['search'])) {
            $term = trim($filters['search']);
            $query->where(function (Builder $q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhereHas('product', fn ($pq) => $pq->where('name', 'like', "%{$term}%")->orWhere('sku', 'like', "%{$term}%"))
                    ->orWhereHas('company', fn ($cq) => $cq->where('name', 'like', "%{$term}%"));
            });
        }

        return $query->orderByDesc('id')->paginate($perPage);
    }
}
