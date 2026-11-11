<?php

namespace App\Http\Requests;

use App\Models\ShopProduct;
use Illuminate\Foundation\Http\FormRequest;

class UpdateShopProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        foreach (['name', 'price', 'description', 'status'] as $field) {
            if ($this->has($field) && trim((string) $this->input($field)) === '') {
                $this->merge([$field => null]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:255'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'thumbnail' => ['nullable'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'in:'.implode(',', array_keys(ShopProduct::STATUS_LIST))],
        ];
    }
}
