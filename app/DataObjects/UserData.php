<?php

namespace App\DataObjects;

use Illuminate\Http\UploadedFile;

readonly class UserData
{
    public function __construct(
        public string $name,
        public string $email,
        public ?string $password = null,
        public ?string $phone = null,
        public ?int $companyId = null,
        public ?string $role = null,
        public ?UploadedFile $photo = null,
        public int $status = 1,
        public array $provided = [],
    ) {}

    public static function fromArray(array $data, ?UploadedFile $photo = null): self
    {
        $clean = static fn (mixed $val): ?string => (is_string($val) && trim($val) !== '') ? trim($val) : null;

        return new self(
            name: trim($data['name']),
            email: trim(strtolower($data['email'])),
            password: ! empty($data['password']) ? (string) $data['password'] : null,
            phone: $clean($data['phone'] ?? null),
            companyId: isset($data['company_id']) && $data['company_id'] !== '' ? (int) $data['company_id'] : null,
            role: $clean($data['role'] ?? null),
            photo: $photo,
            status: isset($data['status']) && $data['status'] !== '' ? (int) $data['status'] : 1,
            provided: array_keys($data),
        );
    }

    public function hasProvided(string $key): bool
    {
        return in_array($key, $this->provided, true);
    }
}
