<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;

class ProductPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->isOwner(); // Any authenticated owner can view the shared catalog
    }

    public function view(User $user, Product $product): bool
    {
        return $user->isOwner();
    }

    public function create(User $user): bool
    {
        return $user->isOwner();
    }

    public function update(User $user, Product $product): bool
    {
        return $user->isOwner() && (int) $product->created_by === (int) $user->id;
    }

    public function delete(User $user, Product $product): bool
    {
        return $user->isOwner() && (int) $product->created_by === (int) $user->id;
    }
}
