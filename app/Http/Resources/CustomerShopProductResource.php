<?php

namespace App\Http\Resources;

use App\Models\ShopProduct;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerShopProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var ShopProduct $this */
        $originalPrice = (float) ($this->product?->price ?? 0);
        $effectivePrice = $this->effectivePrice();
        $stock = max(0, (int) ($this->product?->stock ?? 0));

        return [
            'id' => $this->id,
            'company_id' => $this->company_id,
            'company_name' => $this->company?->name,
            'product_id' => $this->product_id,
            'name' => $this->effectiveName(),
            'price' => $effectivePrice,
            'original_price' => $originalPrice,
            'has_discount' => $this->price !== null && $effectivePrice < $originalPrice,
            'stock' => $stock,
            'thumbnail' => $this->effectiveThumbnail(),
            'description' => $this->effectiveDescription(),
            'sku' => $this->product?->sku,
        ];
    }
}
