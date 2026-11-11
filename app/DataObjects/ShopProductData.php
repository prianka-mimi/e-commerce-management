<?php

namespace App\DataObjects;

use Illuminate\Http\UploadedFile;

readonly class ShopProductData
{
    public function __construct(
        public int $companyId,
        public int $productId,
        public ?string $name = null,
        public ?float $price = null,
        public ?string $description = null,
        public ?UploadedFile $thumbnail = null,
        public ?string $thumbnailUrl = null,
        public int $status = 1,
        public array $provided = [],
    ) {}

    public static function fromArray(array $data, ?UploadedFile $thumbnail = null): self
    {
        $clean = static fn (mixed $val): ?string => (is_string($val) && trim($val) !== '') ? trim($val) : null;

        return new self(
            companyId: isset($data['company_id']) ? (int) $data['company_id'] : 0,
            productId: isset($data['product_id']) ? (int) $data['product_id'] : 0,
            name: $clean($data['name'] ?? null),
            price: isset($data['price']) && $data['price'] !== '' ? (float) $data['price'] : null,
            description: $clean($data['description'] ?? null),
            thumbnail: $thumbnail,
            thumbnailUrl: isset($data['thumbnail']) && is_string($data['thumbnail']) ? $clean($data['thumbnail']) : null,
            status: isset($data['status']) && $data['status'] !== '' ? (int) $data['status'] : 1,
            provided: array_keys($data),
        );
    }

    public function hasProvided(string $key): bool
    {
        return in_array($key, $this->provided, true);
    }
}
