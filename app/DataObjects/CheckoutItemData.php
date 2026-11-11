<?php

namespace App\DataObjects;

readonly class CheckoutItemData
{
    public function __construct(
        public int $shopProductId,
        public int $quantity,
    ) {}

    public static function fromArray(array $item): self
    {
        return new self(
            shopProductId: (int) $item['shop_product_id'],
            quantity: (int) ($item['quantity'] ?? 1),
        );
    }
}
