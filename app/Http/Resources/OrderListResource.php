<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'company_id' => $this->company_id,
            'customer_id' => $this->customer_id,
            'user_id' => $this->user_id,
            'total_amount' => (float) $this->total_amount,
            'payment_method' => (int) $this->payment_method,
            'payment_method_name' => $this->payment_method_name,
            'trx_id' => $this->trx_id,
            'discount' => (float) $this->discount,
            'note' => $this->note,
            'status' => (int) $this->status,
            'status_text' => $this->status_text,
            'shop_name' => $this->company?->name,
            'customer' => $this->customer ? [
                'id' => $this->customer->id,
                'name' => $this->customer->name,
                'email' => $this->customer->email,
                'phone' => $this->customer->phone,
                'address' => $this->customer->address,
            ] : null,
            'items' => $this->whenLoaded('items', function () {
                return $this->items->map(fn ($item) => [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'shop_product_id' => $item->shop_product_id,
                    'product_name' => $item->shopProduct?->effectiveName() ?? $item->product?->name ?? 'Product',
                    'quantity' => (int) $item->quantity,
                    'price' => (float) $item->price,
                    'total' => (float) $item->total,
                ]);
            }),
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at?->format('Y-m-d H:i:s'),
        ];
    }
}
