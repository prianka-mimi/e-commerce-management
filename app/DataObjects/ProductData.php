<?php

namespace App\DataObjects;

use Illuminate\Http\UploadedFile;

readonly class ProductData
{
    public function __construct(
        public string $name,
        public float $price,
        public ?float $cost = null,
        public ?float $discount = null,
        public int $stock = 0,
        public ?string $sku = null,
        public ?string $description = null,
        public ?UploadedFile $photo = null,
        public ?string $photoUrl = null,
        public int $status = 1,
        public ?int $companyId = null,
        public ?int $createdBy = null,
        public array $provided = [],
    ) {}

    public static function fromArray(array $data, ?UploadedFile $photo = null): self
    {
        $clean = static fn (mixed $val): ?string => (is_string($val) && trim($val) !== '') ? trim($val) : null;

        return new self(
            name: trim($data['name']),
            price: (float) ($data['price'] ?? 0),
            cost: isset($data['cost']) && $data['cost'] !== '' ? (float) $data['cost'] : null,
            discount: isset($data['discount']) && $data['discount'] !== '' ? (float) $data['discount'] : null,
            stock: isset($data['stock']) && $data['stock'] !== '' ? (int) $data['stock'] : 0,
            sku: $clean($data['sku'] ?? null),
            description: $clean($data['description'] ?? null),
            photo: $photo,
            photoUrl: isset($data['photo']) && is_string($data['photo']) ? $clean($data['photo']) : null,
            status: isset($data['status']) && $data['status'] !== '' ? (int) $data['status'] : 1,
            companyId: isset($data['company_id']) && $data['company_id'] !== '' ? (int) $data['company_id'] : null,
            createdBy: isset($data['created_by']) && $data['created_by'] !== '' ? (int) $data['created_by'] : null,
            provided: array_keys($data),
        );
    }

    public function hasProvided(string $key): bool
    {
        return in_array($key, $this->provided, true);
    }
}
