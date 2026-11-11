<?php

namespace App\Services;

use App\DataObjects\CompanyData;
use App\Models\Company;
use App\Models\ShopProduct;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class CompanyService
{
    public function __construct(
        protected ImageService $imageService
    ) {}

    public function paginate(array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $query = Company::query()->with(['owner']);

        if (! empty($filters['name'])) {
            $query->where('name', 'like', '%'.trim($filters['name']).'%');
        }

        if (! empty($filters['email'])) {
            $query->where('email', 'like', '%'.trim($filters['email']).'%');
        }

        if (! empty($filters['phone'])) {
            $query->where('phone', 'like', '%'.trim($filters['phone']).'%');
        }

        if (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', (int) $filters['status']);
        }

        $query->withCount([
            'shopProducts' => fn ($q) => $q->where('status', ShopProduct::STATUS_ACTIVE),
        ]);

        return $query->orderByDesc('id')->paginate($perPage);
    }

    public function find(int $id): Company
    {
        return Company::with(['owner', 'shopProducts.product'])->findOrFail($id);
    }

    public function create(CompanyData $data): Company
    {
        try {
            DB::beginTransaction();

            $logoPath = $this->imageService->resolveMediaValue(
                $data->logo,
                $data->logoUrl,
                null,
                Company::LOGO_PATH
            );

            if ($data->isDefault) {
                Company::where('is_default', Company::IS_DEFAULT)->update(['is_default' => 0]);
            }

            $company = Company::create([
                'user_id' => $data->userId,
                'name' => $data->name,
                'email' => $data->email,
                'phone' => $data->phone,
                'address' => $data->address,
                'website' => $data->website,
                'sort_description' => $data->sortDescription,
                'description' => $data->description,
                'logo' => $logoPath,
                'status' => $data->status,
                'is_default' => $data->isDefault,
            ]);

            if ($data->userId) {
                User::where('id', $data->userId)->update(['company_id' => $company->id]);
            }

            DB::commit();

            return $company->load('owner');
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Shop creation failed', ['exception' => $e->getMessage()]);
            throw $e;
        }
    }

    public function update(Company $company, CompanyData $data): Company
    {
        try {
            DB::beginTransaction();

            $previousUserId = $company->user_id;
            $logoPath = $this->imageService->resolveMediaValue(
                $data->logo,
                $data->logoUrl,
                $company->logo,
                Company::LOGO_PATH
            );

            if ($data->hasProvided('is_default') && $data->isDefault && ! $company->isDefault()) {
                Company::where('is_default', Company::IS_DEFAULT)->update(['is_default' => 0]);
            }

            $company->update([
                'user_id' => $data->hasProvided('user_id') ? $data->userId : $company->user_id,
                'name' => $data->name,
                'email' => $data->hasProvided('email') ? $data->email : $company->email,
                'phone' => $data->hasProvided('phone') ? $data->phone : $company->phone,
                'address' => $data->hasProvided('address') ? $data->address : $company->address,
                'website' => $data->hasProvided('website') ? $data->website : $company->website,
                'sort_description' => $data->hasProvided('sort_description') ? $data->sortDescription : $company->sort_description,
                'description' => $data->hasProvided('description') ? $data->description : $company->description,
                'logo' => $logoPath,
                'status' => $data->hasProvided('status') ? $data->status : $company->status,
                'is_default' => $data->hasProvided('is_default') ? $data->isDefault : $company->is_default,
            ]);

            $newUserId = $company->user_id;
            if ($previousUserId && $previousUserId !== $newUserId) {
                User::where('id', $previousUserId)
                    ->where('company_id', $company->id)
                    ->update(['company_id' => null]);
            }

            if ($newUserId) {
                User::where('id', $newUserId)->update(['company_id' => $company->id]);
            }

            DB::commit();

            return $company->fresh(['owner']);
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Shop update failed', ['id' => $company->id, 'exception' => $e->getMessage()]);
            throw $e;
        }
    }

    public function delete(Company $company): bool
    {
        try {
            DB::beginTransaction();

            if ($company->logo) {
                $this->imageService->delete($company->logo);
            }

            User::where('company_id', $company->id)->update(['company_id' => null]);
            $deleted = $company->delete();

            DB::commit();

            return (bool) $deleted;
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Shop deletion failed', ['id' => $company->id, 'exception' => $e->getMessage()]);
            throw $e;
        }
    }
}
