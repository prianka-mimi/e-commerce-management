<?php

namespace App\Policies;

use App\Models\Company;
use App\Models\User;

class CompanyPolicy
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
        return $user->isOwner();
    }

    public function view(User $user, Company $company): bool
    {
        return (int) $user->company_id === (int) $company->id || (int) $company->user_id === (int) $user->id;
    }

    public function create(User $user): bool
    {
        return false; // Only admin can create shops
    }

    public function update(User $user, Company $company): bool
    {
        return (int) $user->company_id === (int) $company->id || (int) $company->user_id === (int) $user->id;
    }

    public function delete(User $user, Company $company): bool
    {
        return false;
    }
}
