<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
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
        return false;
    }

    public function view(User $user, User $target): bool
    {
        return (int) $user->id === (int) $target->id;
    }

    public function create(User $user): bool
    {
        return false;
    }

    public function update(User $user, User $target): bool
    {
        return (int) $user->id === (int) $target->id;
    }

    public function delete(User $user, User $target): bool
    {
        return false;
    }

    public function resetPassword(User $user, User $target): bool
    {
        return false;
    }
}
