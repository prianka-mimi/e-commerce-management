<?php

namespace App\Services;

use App\DataObjects\ProductData;
use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class ProductService
{
    public function __construct(
        protected ImageService $imageService
    ) {}

    public function paginate(array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $query = Product::query()->with(['creator', 'company']);

        if (! empty($filters['name'])) {
            $query->where('name', 'like', '%'.trim($filters['name']).'%');
        }

        if (! empty($filters['sku'])) {
            $query->where('sku', 'like', '%'.trim($filters['sku']).'%');
        }

        if (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', (int) $filters['status']);
        }

        return $query->orderByDesc('id')->paginate($perPage);
    }

    public function find(int $id): Product
    {
        return Product::with(['creator', 'company'])->findOrFail($id);
    }

    public function create(ProductData $data): Product
    {
        try {
            DB::beginTransaction();

            $photoPath = $this->imageService->resolveMediaValue(
                $data->photo,
                $data->photoUrl,
                null,
                Product::IMAGE_PATH
            );

            $sku = $data->sku ?: 'SKU-'.strtoupper(Str::random(6));

            $product = Product::create([
                'name' => $data->name,
                'slug' => Str::slug($data->name).'-'.strtolower(Str::random(4)),
                'sku' => $sku,
                'price' => $data->price,
                'cost' => $data->cost,
                'discount' => $data->discount,
                'stock' => $data->stock,
                'description' => $data->description,
                'photo' => $photoPath,
                'status' => $data->status,
                'company_id' => $data->companyId,
                'created_by' => $data->createdBy ?? auth()->id(),
            ]);

            DB::commit();

            return $product->load(['creator', 'company']);
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Product creation failed', ['exception' => $e->getMessage()]);
            throw $e;
        }
    }

    public function update(Product $product, ProductData $data): Product
    {
        try {
            DB::beginTransaction();

            $photoPath = $this->imageService->resolveMediaValue(
                $data->photo,
                $data->photoUrl,
                $product->photo,
                Product::IMAGE_PATH
            );

            $product->update([
                'name' => $data->name,
                'sku' => ($data->hasProvided('sku') && $data->sku !== null) ? $data->sku : $product->sku,
                'price' => $data->price,
                'cost' => $data->hasProvided('cost') ? $data->cost : $product->cost,
                'discount' => $data->hasProvided('discount') ? $data->discount : $product->discount,
                'stock' => $data->hasProvided('stock') ? $data->stock : $product->stock,
                'description' => $data->hasProvided('description') ? $data->description : $product->description,
                'photo' => $photoPath,
                'status' => $data->hasProvided('status') ? $data->status : $product->status,
            ]);

            DB::commit();

            return $product->fresh(['creator', 'company']);
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Product update failed', ['id' => $product->id, 'exception' => $e->getMessage()]);
            throw $e;
        }
    }

    public function delete(Product $product): bool
    {
        try {
            DB::beginTransaction();

            if ($product->photo) {
                $this->imageService->delete($product->photo);
            }

            $deleted = $product->delete();

            DB::commit();

            return (bool) $deleted;
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Product deletion failed', ['id' => $product->id, 'exception' => $e->getMessage()]);
            throw $e;
        }
    }
}
