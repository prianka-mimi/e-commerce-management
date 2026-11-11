<?php

namespace App\Services;

use App\DataObjects\CustomerCheckoutData;
use App\Models\Company;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ShopProduct;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Throwable;

class CustomerOrderService
{
    /**
     * Process checkout for customer cart items.
     *
     * @return Order The primary created order
     *
     * @throws Throwable
     */
    public function checkout(CustomerCheckoutData $data): Order
    {
        // 1. Fetch and validate all shop products
        $shopProductIds = array_map(fn ($item) => $item->shopProductId, $data->items);
        $shopProducts = ShopProduct::with(['product', 'company'])
            ->whereIn('id', $shopProductIds)
            ->active()
            ->whereHas('company', fn ($q) => $q->where('status', Company::STATUS_ACTIVE))
            ->whereHas('product', fn ($q) => $q->where('status', Product::STATUS_ACTIVE))
            ->get()
            ->keyBy('id');

        if ($shopProducts->count() !== count(array_unique($shopProductIds))) {
            throw new InvalidArgumentException('One or more items in your cart are no longer active or available.');
        }

        // Verify requested quantities against current product stock
        $requestedPerProduct = [];
        foreach ($data->items as $item) {
            $sp = $shopProducts->get($item->shopProductId);
            if (! $sp || ! $sp->product) {
                throw new InvalidArgumentException('One or more items in your cart are no longer active or available.');
            }
            $requestedPerProduct[$sp->product_id] = ($requestedPerProduct[$sp->product_id] ?? 0) + $item->quantity;
            if ($sp->product->stock < $requestedPerProduct[$sp->product_id]) {
                throw new InvalidArgumentException("Insufficient stock for {$sp->product->name}. Available: {$sp->product->stock}.");
            }
        }

        try {
            DB::beginTransaction();

            // Lock all involved catalog product rows inside the transaction
            $productIds = $shopProducts->pluck('product_id')->unique()->values()->all();
            $lockedProducts = Product::query()
                ->whereIn('id', $productIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            // Group requested items by shop/company
            $itemsByShop = [];
            foreach ($data->items as $item) {
                $sp = $shopProducts->get($item->shopProductId);
                $itemsByShop[$sp->company_id][] = [
                    'shop_product' => $sp,
                    'quantity' => $item->quantity,
                    'price' => $sp->effectivePrice(),
                ];
            }

            $createdOrders = [];
            $authenticatedUserId = auth('sanctum')->id();

            foreach ($itemsByShop as $companyId => $shopItems) {
                // Find or create customer under this shop
                $customer = Customer::firstOrCreate(
                    [
                        'email' => $data->customerEmail,
                        'company_id' => $companyId,
                    ],
                    [
                        'name' => $data->customerName,
                        'phone' => $data->customerPhone,
                        'address' => $data->shippingAddress,
                        'status' => 1,
                    ]
                );

                // Update contact details if provided
                $customer->update([
                    'name' => $data->customerName,
                    'phone' => $data->customerPhone,
                    'address' => $data->shippingAddress,
                ]);

                // Calculate order subtotal
                $orderTotal = 0;
                foreach ($shopItems as $entry) {
                    $orderTotal += $entry['price'] * $entry['quantity'];
                }

                // Create Order record
                $order = Order::create([
                    'company_id' => $companyId,
                    'customer_id' => $customer->id,
                    'user_id' => $authenticatedUserId,
                    'total_amount' => $orderTotal,
                    'payment_method' => $data->paymentMethod,
                    'trx_id' => 'ORD-'.strtoupper(Str::random(8)),
                    'discount' => 0,
                    'given_amount' => (int) round($orderTotal),
                    'change_amount' => 0,
                    'note' => $data->note,
                    'status' => Order::STATUS_COMPLETED,
                ]);

                // Create OrderItem records and atomically decrement catalog stock
                foreach ($shopItems as $entry) {
                    /** @var ShopProduct $sp */
                    $sp = $entry['shop_product'];
                    $qty = $entry['quantity'];
                    $price = $entry['price'];
                    $lockedProduct = $lockedProducts->get($sp->product_id);

                    if (! $lockedProduct || $lockedProduct->stock < $qty) {
                        $available = $lockedProduct?->stock ?? 0;
                        $productName = $lockedProduct?->name ?? $sp->product?->name ?? 'Product';
                        throw new InvalidArgumentException("Insufficient stock for {$productName}. Available: {$available}.");
                    }

                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $sp->product_id,
                        'shop_product_id' => $sp->id,
                        'quantity' => $qty,
                        'price' => $price,
                        'total' => $price * $qty,
                    ]);

                    $updatedRows = Product::query()
                        ->whereKey($lockedProduct->id)
                        ->where('stock', '>=', $qty)
                        ->decrement('stock', $qty);

                    if ($updatedRows < 1) {
                        throw new InvalidArgumentException("Insufficient stock for {$lockedProduct->name}.");
                    }

                    $lockedProduct->stock -= $qty;
                }

                $createdOrders[] = $order;
            }

            DB::commit();

            // Return first created order with relationships loaded
            $firstOrder = $createdOrders[0];
            $firstOrder->load(['company', 'customer', 'items.product', 'items.shopProduct']);

            return $firstOrder;
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Customer checkout failed', [
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }
}
