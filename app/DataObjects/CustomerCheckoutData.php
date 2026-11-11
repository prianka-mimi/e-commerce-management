<?php

namespace App\DataObjects;

use App\Models\Order;

readonly class CustomerCheckoutData
{
    /**
     * @param  CheckoutItemData[]  $items
     */
    public function __construct(
        public string $customerName,
        public string $customerEmail,
        public string $customerPhone,
        public string $shippingAddress,
        public ?string $note,
        public int $paymentMethod,
        public array $items,
    ) {}

    public static function fromRequest(array $validated): self
    {
        $items = array_map(
            fn (array $item) => CheckoutItemData::fromArray($item),
            $validated['items']
        );

        $rawMethod = strtolower((string) ($validated['payment_method'] ?? 'cod'));
        $paymentMethod = match ($rawMethod) {
            'card', '2' => Order::PAYMENT_CARD,
            'online', '3' => Order::PAYMENT_ONLINE,
            default => Order::PAYMENT_COD,
        };

        return new self(
            customerName: trim($validated['name']),
            customerEmail: trim(strtolower($validated['email'])),
            customerPhone: trim($validated['phone']),
            shippingAddress: trim($validated['address']),
            note: isset($validated['note']) ? trim($validated['note']) : null,
            paymentMethod: $paymentMethod,
            items: $items,
        );
    }
}
