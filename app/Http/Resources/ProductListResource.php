<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductListResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'price' => (float) $this->price,
            'stock' => (int) ($this->stock ?? 0),
            'cost' => $this->cost !== null ? (float) $this->cost : null,
            'discount' => $this->discount !== null ? (float) $this->discount : null,
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'description' => $this->description,
            'status' => (int) $this->status,
            'status_text' => Product::STATUS_LIST[$this->status] ?? 'Active',
            'photo' => $this->photoUrl(),
            'company_id' => $this->company_id,
            'created_by' => $this->created_by,
            'is_assigned' => (bool) ($this->is_assigned ?? false),
            'shop_product_id' => $this->shop_product_id ?? null,
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}
