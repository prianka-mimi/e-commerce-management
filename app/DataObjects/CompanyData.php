<?php

namespace App\DataObjects;

use Illuminate\Http\UploadedFile;

readonly class CompanyData
{
    public function __construct(
        public string $name,
        public ?int $userId = null,
        public ?string $email = null,
        public ?string $phone = null,
        public ?string $address = null,
        public ?string $website = null,
        public ?string $sortDescription = null,
        public ?string $description = null,
        public ?UploadedFile $logo = null,
        public ?string $logoUrl = null,
        public int $status = 1,
        public int $isDefault = 0,
        public array $provided = [],
    ) {}

    public static function fromArray(array $data, ?UploadedFile $logo = null): self
    {
        $clean = static fn (mixed $val): ?string => (is_string($val) && trim($val) !== '') ? trim($val) : null;
        $email = $clean($data['email'] ?? null);

        return new self(
            name: trim($data['name']),
            userId: isset($data['user_id']) && $data['user_id'] !== '' ? (int) $data['user_id'] : null,
            email: $email !== null ? strtolower($email) : null,
            phone: $clean($data['phone'] ?? null),
            address: $clean($data['address'] ?? null),
            website: $clean($data['website'] ?? null),
            sortDescription: $clean($data['sort_description'] ?? null),
            description: $clean($data['description'] ?? null),
            logo: $logo,
            logoUrl: isset($data['logo']) && is_string($data['logo']) ? $clean($data['logo']) : null,
            status: isset($data['status']) && $data['status'] !== '' ? (int) $data['status'] : 1,
            isDefault: ! empty($data['is_default']) ? 1 : 0,
            provided: array_keys($data),
        );
    }

    public function hasProvided(string $key): bool
    {
        return in_array($key, $this->provided, true);
    }
}
