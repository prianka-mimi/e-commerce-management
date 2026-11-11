<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShopProduct extends Model
{
    use HasFactory;

    public const STATUS_ACTIVE = 1;

    public const STATUS_INACTIVE = 2;

    public const STATUS_LIST = [
        self::STATUS_ACTIVE => 'Active',
        self::STATUS_INACTIVE => 'Inactive',
    ];

    public const IMAGE_PATH = 'uploads/shop_products/';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'price' => 'float',
            'status' => 'integer',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopeByShop(Builder $query, int $companyId): Builder
    {
        return $query->where('company_id', $companyId);
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * Effective product title: shop override if set, otherwise master catalog product name.
     */
    public function effectiveName(): string
    {
        return $this->name ?: ($this->product?->name ?? 'Product');
    }

    /**
     * Effective price: shop override if set, otherwise product catalog base price.
     */
    public function effectivePrice(): float
    {
        return (float) ($this->price ?? $this->product?->price ?? 0);
    }

    /**
     * Effective thumbnail: shop override if set, otherwise master product photo.
     */
    public function effectiveThumbnail(): string
    {
        if ($this->thumbnail) {
            return str_starts_with($this->thumbnail, 'http')
                ? $this->thumbnail
                : '/storage/'.ltrim($this->thumbnail, '/');
        }

        if ($this->product?->photo) {
            return str_starts_with($this->product->photo, 'http')
                ? $this->product->photo
                : '/storage/'.ltrim($this->product->photo, '/');
        }

        return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
    }

    /**
     * Effective description/details: shop override if set, otherwise master product description.
     */
    public function effectiveDescription(): ?string
    {
        return $this->description ?: $this->product?->description;
    }
}
