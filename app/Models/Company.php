<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Company extends Model
{
    use HasFactory, LogsActivity;

    public const STATUS_ACTIVE = 1;

    public const STATUS_INACTIVE = 2;

    public const STATUS_PENDING = 3;

    public const STATUS_LIST = [
        self::STATUS_ACTIVE => 'Active',
        self::STATUS_INACTIVE => 'Inactive',
        self::STATUS_PENDING => 'Pending',
    ];

    public const IS_DEFAULT = 1;

    public const IS_NOT_DEFAULT = 0;

    public const LOGO_PATH = 'uploads/companies/logos/';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'status' => 'integer',
            'is_default' => 'integer',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'email', 'phone', 'status', 'user_id'])
            ->logOnlyDirty()
            ->setDescriptionForEvent(fn (string $eventName) => "Shop {$eventName}")
            ->dontSubmitEmptyLogs();
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'company_id');
    }

    public function shopProducts(): HasMany
    {
        return $this->hasMany(ShopProduct::class, 'company_id');
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'shop_products')
            ->withPivot(['id', 'price', 'thumbnail', 'description', 'status'])
            ->withTimestamps();
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'company_id');
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class, 'company_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopeDefault(Builder $query): Builder
    {
        return $query->where('is_default', self::IS_DEFAULT);
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isDefault(): bool
    {
        return $this->is_default === self::IS_DEFAULT;
    }

    public function logoUrl(): string
    {
        if ($this->logo) {
            return str_starts_with($this->logo, 'http') || str_starts_with($this->logo, '/')
                ? $this->logo
                : '/storage/'.ltrim($this->logo, '/');
        }

        return '/img/default.png';
    }
}
