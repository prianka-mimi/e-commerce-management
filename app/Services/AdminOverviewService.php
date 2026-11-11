<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\ShopProduct;
use App\Models\User;

class AdminOverviewService
{
    /**
     * Compile administrative metrics and latest 6 orders.
     */
    public function getOverviewData(): array
    {
        $totalShops = Company::count();
        $totalSellers = User::role('Owner')->count();
        $totalBuyers = max(User::role('Customer')->count(), Customer::count());
        $totalProducts = ShopProduct::count();
        $totalCatalog = Product::count();

        $latestOrders = Order::query()
            ->with(['company', 'customer', 'items.product', 'items.shopProduct.product'])
            ->orderByDesc('id')
            ->take(6)
            ->get()
            ->map(fn (Order $order) => [
                'id' => $order->id,
                'trx_id' => $order->trx_id,
                'shop_name' => $order->company?->name ?? 'Direct Store',
                'customer_name' => $order->customer?->name ?? 'Customer',
                'customer_email' => $order->customer?->email,
                'customer_phone' => $order->customer?->phone,
                'total_amount' => (float) $order->total_amount,
                'items_count' => $order->items->sum('quantity'),
                'status' => (int) $order->status,
                'status_text' => $order->status_text,
                'items' => $order->items->map(fn ($item) => [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_name' => $item->shopProduct?->effectiveName() ?? $item->product?->name ?? 'Product',
                    'quantity' => (int) $item->quantity,
                    'price' => (float) $item->price,
                    'total' => (float) $item->total,
                ])->values()->toArray(),
                'created_at' => $order->created_at?->format('Y-m-d H:i'),
            ]);

        return [
            'metrics' => [
                'total_shops' => $totalShops,
                'total_sellers' => $totalSellers,
                'total_buyers' => $totalBuyers,
                'total_products' => $totalProducts,
                'total_catalog' => $totalCatalog,
            ],
            'latest_orders' => $latestOrders,
        ];
    }
}
