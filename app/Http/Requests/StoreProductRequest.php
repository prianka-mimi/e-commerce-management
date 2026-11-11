<?php

namespace App\Http\Requests;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        foreach (['description', 'discount', 'sku', 'barcode', 'cost', 'stock', 'expire_date', 'status', 'company_id'] as $field) {
            if ($this->has($field) && trim((string) $this->input($field)) === '') {
                $this->merge([$field => null]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'sku' => ['nullable', 'string', 'max:255', 'unique:products,sku'],
            'barcode' => ['nullable', 'string', 'max:255'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'price' => ['required', 'numeric', 'min:0'],
            'stock' => ['nullable', 'integer', 'min:0'],
            'expire_date' => ['nullable', 'date'],
            'status' => ['nullable', 'in:'.implode(',', array_keys(Product::STATUS_LIST))],
            'photo' => ['nullable'],
            'company_id' => ['nullable', 'exists:companies,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Product name is required.',
            'price.required' => 'Product base price is required.',
            'price.numeric' => 'Price must be a valid number.',
            'sku.unique' => 'This SKU already exists in the catalog.',
        ];
    }
}
