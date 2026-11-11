<?php

namespace App\Http\Resources;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerOrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Order $this */
        return [
            'id' => $this->id,
            'trx_id' => $this->trx_id,
            'company_id' => $this->company_id,
            'shop_name' => $this->company?->name,
            'customer_name' => $this->customer?->name,
            'customer_email' => $this->customer?->email,
            'customer_phone' => $this->customer?->phone,
            'shipping_address' => $this->customer?->address,
            'total_amount' => (float) $this->total_amount,
            'payment_method' => (int) $this->payment_method,
            'payment_method_name' => $this->payment_method_name,
            'status' => (int) $this->status,
            'status_text' => $this->status_text,
            'note' => $this->note,
            'items' => $this->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'shop_product_id' => $item->shop_product_id,
                    'product_name' => $item->product?->name ?? 'Product',
                    'price' => (float) $item->price,
                    'quantity' => (int) $item->quantity,
                    'total' => (float) $item->total,
                    'thumbnail' => $item->shopProduct?->effectiveThumbnail() ?? $item->product?->photoUrl(),
                ];
            }),
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
        ];
    }
}
