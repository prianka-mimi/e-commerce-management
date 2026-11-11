<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('shop_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('name')->nullable()->comment('Shop-specific product title override');
            $table->decimal('price', 10, 2)->nullable()->comment('Shop-specific price override');
            $table->string('thumbnail')->nullable()->comment('Shop-specific thumbnail override');
            $table->text('description')->nullable()->comment('Shop-specific description override');
            $table->tinyInteger('status')->default(1)->index()->comment('1=Active, 2=Inactive');
            $table->timestamps();

            $table->unique(['company_id', 'product_id']);
            $table->index('product_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shop_products');
    }
};
