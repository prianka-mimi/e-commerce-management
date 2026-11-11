<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return null;
    }

    protected function resolveOwnerShopId(User $user): ?int
    {
        return $user->company_id
            ?: (app()->bound('company') ? (app('company')->id ?? null) : null)
            ?: $user->ownedShop()->value('id');
    }

    public function viewAny(User $user): bool
    {
        return $user->isOwner();
    }

    public function view(User $user, Order $order): bool
    {
        $shopId = $this->resolveOwnerShopId($user);

        return $user->isOwner() && $shopId !== null && (int) $shopId === (int) $order->company_id;
    }

    public function create(User $user): bool
    {
        return $user->isOwner();
    }

    public function update(User $user, Order $order): bool
    {
        $shopId = $this->resolveOwnerShopId($user);

        return $user->isOwner() && $shopId !== null && (int) $shopId === (int) $order->company_id;
    }

    public function delete(User $user, Order $order): bool
    {
        return false;
    }
}
