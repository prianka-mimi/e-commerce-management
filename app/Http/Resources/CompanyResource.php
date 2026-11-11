<?php

namespace App\Http\Resources;

use App\Models\Company;
use App\Models\ShopProduct;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanyResource extends JsonResource
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
            'user_id' => $this->user_id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'address' => $this->address,
            'website' => $this->website,
            'logo' => $this->logoUrl(),
            'status' => (int) $this->status,
            'status_text' => $this->status == Company::STATUS_ACTIVE ? 'Active' : ($this->status == Company::STATUS_INACTIVE ? 'Inactive' : 'Pending'),
            'sort_description' => $this->sort_description,
            'description' => $this->description,
            'is_default' => (int) $this->is_default,
            'shop_products_count' => $this->shop_products_count ?? $this->shopProducts()->where('status', ShopProduct::STATUS_ACTIVE)->count(),
            'preview_products' => $this->relationLoaded('shopProducts') ? $this->shopProducts->map(fn ($sp) => [
                'id' => $sp->id,
                'name' => $sp->product?->name,
                'price' => $sp->effectivePrice(),
                'thumbnail' => $sp->effectiveThumbnail(),
            ]) : [],
            'owner' => $this->whenLoaded('owner', function () {
                return [
                    'id' => $this->owner?->id,
                    'name' => $this->owner?->name,
                    'email' => $this->owner?->email,
                ];
            }),
            'user' => $this->whenLoaded('owner', function () {
                return [
                    'id' => $this->owner?->id,
                    'name' => $this->owner?->name,
                    'email' => $this->owner?->email,
                ];
            }),
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at?->format('Y-m-d H:i:s'),
        ];
    }
}
