<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory;

    public const STATUS_COMPLETED = 1;

    public const STATUS_REFUNDED = 2;

    public const STATUS_PENDING = 3;

    public const STATUS_CONFIRMED = 4;

    public const STATUS_PROCESSING = 5;

    public const STATUS_ON_HOLD = 6;

    public const STATUS_CANCELLED = 7;

    public const STATUS_LIST = [
        self::STATUS_COMPLETED => 'Completed',
        self::STATUS_REFUNDED => 'Refunded',
        self::STATUS_PENDING => 'Pending',
        self::STATUS_CONFIRMED => 'Confirmed',
        self::STATUS_PROCESSING => 'Processing',
        self::STATUS_ON_HOLD => 'On Hold',
        self::STATUS_CANCELLED => 'Cancelled',
    ];

    public const PAYMENT_COD = 1;

    public const PAYMENT_CARD = 2;

    public const PAYMENT_ONLINE = 3;

    public const PAYMENT_METHOD_LIST = [
        self::PAYMENT_COD => 'Cash on Delivery',
        self::PAYMENT_CARD => 'Card',
        self::PAYMENT_ONLINE => 'Online Payment',
    ];

    protected $guarded = [];

    protected $appends = ['status_text', 'payment_method_name'];

    protected function casts(): array
    {
        return [
            'total_amount' => 'float',
            'discount' => 'float',
            'given_amount' => 'integer',
            'change_amount' => 'integer',
            'payment_method' => 'integer',
            'status' => 'integer',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function scopeByShop(Builder $query, int $companyId): Builder
    {
        return $query->where('company_id', $companyId);
    }

    public function scopeRecent(Builder $query): Builder
    {
        return $query->orderByDesc('id');
    }

    public function getStatusTextAttribute(): string
    {
        return self::STATUS_LIST[$this->status] ?? 'Unknown';
    }

    public function getPaymentMethodNameAttribute(): string
    {
        return self::PAYMENT_METHOD_LIST[$this->payment_method] ?? 'N/A';
    }
}
