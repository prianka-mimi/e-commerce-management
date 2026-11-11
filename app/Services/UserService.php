<?php

namespace App\Services;

use App\DataObjects\UserData;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Spatie\Permission\Models\Role;
use Throwable;

class UserService
{
    public function __construct(
        protected ImageService $imageService
    ) {}

    public function paginate(array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $query = User::query()->with(['roles', 'company']);

        if (! empty($filters['name'])) {
            $query->where('name', 'like', '%'.trim($filters['name']).'%');
        }

        if (! empty($filters['email'])) {
            $query->where('email', 'like', '%'.trim($filters['email']).'%');
        }

        if (! empty($filters['phone'])) {
            $query->where('phone', 'like', '%'.trim($filters['phone']).'%');
        }

        if (! empty($filters['role'])) {
            $role = trim($filters['role']);
            $query->whereHas('roles', fn ($q) => $q->where('name', $role));
        }

        if (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', (int) $filters['status']);
        }

        if (! empty($filters['company_id'])) {
            $query->where('company_id', (int) $filters['company_id']);
        }

        return $query->orderByDesc('id')->paginate($perPage);
    }

    public function find(int $id): User
    {
        return User::with(['roles', 'company'])->findOrFail($id);
    }

    public function create(UserData $data): User
    {
        try {
            DB::beginTransaction();

            $photoPath = null;
            if ($data->photo) {
                $photoPath = $this->imageService->upload($data->photo, User::AVATAR_PATH);
            }

            $user = User::create([
                'name' => $data->name,
                'email' => $data->email,
                'password' => Hash::make($data->password ?: '12345678'),
                'phone' => $data->phone,
                'company_id' => $data->companyId,
                'photo' => $photoPath,
                'status' => $data->status,
            ]);

            $roleName = $data->role ?: 'Owner';
            if (Role::where('name', $roleName)->exists()) {
                $user->assignRole($roleName);
            }

            DB::commit();

            return $user->load(['roles', 'company']);
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('User creation failed', ['exception' => $e->getMessage()]);
            throw $e;
        }
    }

    public function update(User $user, UserData $data): User
    {
        try {
            DB::beginTransaction();

            $photoPath = $user->photo;
            if ($data->photo) {
                $photoPath = $this->imageService->replace($user->photo, $data->photo, User::AVATAR_PATH);
            }

            $updatePayload = [
                'name' => $data->name,
                'email' => $data->email,
                'phone' => $data->hasProvided('phone') ? $data->phone : $user->phone,
                'company_id' => $data->hasProvided('company_id') ? $data->companyId : $user->company_id,
                'photo' => $photoPath,
                'status' => $data->hasProvided('status') ? $data->status : $user->status,
            ];

            $user->update($updatePayload);

            if (! empty($data->role)) {
                $user->syncRoles([$data->role]);
            }

            DB::commit();

            return $user->fresh(['roles', 'company']);
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('User update failed', ['id' => $user->id, 'exception' => $e->getMessage()]);
            throw $e;
        }
    }

    public function delete(User $user): bool
    {
        try {
            DB::beginTransaction();

            if ($user->photo) {
                $this->imageService->delete($user->photo);
            }

            $deleted = $user->delete();

            DB::commit();

            return (bool) $deleted;
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('User deletion failed', ['id' => $user->id, 'exception' => $e->getMessage()]);
            throw $e;
        }
    }

    public function resetPassword(User $user): void
    {
        $user->update([
            'password' => Hash::make('12345678'),
        ]);
    }
}
