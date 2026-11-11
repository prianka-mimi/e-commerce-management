<?php

namespace App\Http\Requests;

use App\Models\ShopProduct;
use Illuminate\Foundation\Http\FormRequest;

class StoreShopProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        foreach (['company_id', 'name', 'price', 'description', 'status'] as $field) {
            if ($this->has($field) && trim((string) $this->input($field)) === '') {
                $this->merge([$field => null]);
            }
        }
    }

    public function rules(): array
    {
        $user = $this->user();
        $boundCompanyId = app()->bound('company') ? (app('company')->id ?? null) : null;
        $companyId = $user && $user->isOwner()
            ? ($user->company_id ?: $boundCompanyId ?: $user->ownedShop()->value('id'))
            : ($this->input('company_id') ?? $user?->company_id ?? $boundCompanyId);

        return [
            'product_id' => [
                'required',
                'integer',
                'exists:products,id',
                function ($attribute, $value, $fail) use ($companyId) {
                    if ($companyId) {
                        $exists = ShopProduct::query()
                            ->where('company_id', $companyId)
                            ->where('product_id', $value)
                            ->exists();

                        if ($exists) {
                            $fail('This product is already assigned to this shop.');
                        }
                    }
                },
            ],
            'company_id' => ['nullable', 'exists:companies,id'],
            'name' => ['nullable', 'string', 'max:255'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'thumbnail' => ['nullable'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'in:'.implode(',', array_keys(ShopProduct::STATUS_LIST))],
        ];
    }
}
