<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductDetailResource extends JsonResource
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
            'sku' => $this->sku,
            'price' => (float) $this->price,
            'discount' => $this->discount !== null ? (float) $this->discount : null,
            'cost' => $this->cost !== null ? (float) $this->cost : null,
            'stock' => (int) ($this->stock ?? 0),
            'description' => $this->description,
            'status' => (int) $this->status,
            'status_text' => Product::STATUS_LIST[$this->status] ?? 'Active',
            'photo' => $this->photoUrl(),
            'barcode' => $this->barcode ?? '',
            'company_id' => $this->company_id,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}
