<?php

namespace App\Policies;

use App\Models\ShopProduct;
use App\Models\User;

class ShopProductPolicy
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

    public function view(User $user, ShopProduct $shopProduct): bool
    {
        $shopId = $this->resolveOwnerShopId($user);

        return $user->isOwner() && $shopId !== null && (int) $shopId === (int) $shopProduct->company_id;
    }

    public function create(User $user): bool
    {
        return $user->isOwner() && ! empty($this->resolveOwnerShopId($user));
    }

    public function update(User $user, ShopProduct $shopProduct): bool
    {
        $shopId = $this->resolveOwnerShopId($user);

        return $user->isOwner() && $shopId !== null && (int) $shopId === (int) $shopProduct->company_id;
    }

    public function delete(User $user, ShopProduct $shopProduct): bool
    {
        $shopId = $this->resolveOwnerShopId($user);

        return $user->isOwner() && $shopId !== null && (int) $shopId === (int) $shopProduct->company_id;
    }
}
