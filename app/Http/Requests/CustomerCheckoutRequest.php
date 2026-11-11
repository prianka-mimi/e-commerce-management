<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CustomerCheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Public customer checkout
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:191'],
            'email' => ['required', 'email', 'max:191'],
            'phone' => ['required', 'string', 'max:30'],
            'address' => ['required', 'string', 'max:500'],
            'note' => ['nullable', 'string', 'max:1000'],
            'payment_method' => ['nullable', 'string', 'in:cod,card,online,1,2,3'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.shop_product_id' => ['required', 'integer', 'exists:shop_products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Please provide your full name.',
            'email.required' => 'A valid email address is required.',
            'phone.required' => 'Please provide your contact phone number.',
            'address.required' => 'A delivery address is required.',
            'items.required' => 'Your cart is empty.',
            'items.*.shop_product_id.exists' => 'One or more selected items are not available.',
        ];
    }
}
