<?php

namespace App\Http\Resources;

use App\Models\ShopProduct;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ShopProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var ShopProduct $this */
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'company_id' => $this->company_id,
            'name' => $this->effectiveName(),
            'base_name' => $this->product?->name ?? 'Product',
            'shop_name_override' => $this->name,
            'sku' => $this->product?->sku,
            'stock' => (int) ($this->product?->stock ?? 0),
            'base_price' => (float) ($this->product?->price ?? 0),
            'shop_price' => $this->price !== null ? (float) $this->price : null,
            'effective_price' => $this->effectivePrice(),
            'thumbnail' => $this->effectiveThumbnail(),
            'status' => (int) $this->status,
            'status_text' => ShopProduct::STATUS_LIST[$this->status] ?? 'Active',
            'description' => $this->effectiveDescription(),
            'shop_description' => $this->description,
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}
