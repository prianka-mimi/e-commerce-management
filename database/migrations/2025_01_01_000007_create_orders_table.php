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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id')->index();
            $table->unsignedBigInteger('customer_id')->nullable()->index();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('trx_id')->nullable()->index();
            $table->double('total_amount')->default(0);
            $table->tinyInteger('payment_method')->default(1)->comment('1=COD, 2=Card, 3=Online');
            $table->double('discount')->default(0);
            $table->integer('given_amount')->nullable();
            $table->integer('change_amount')->nullable();
            $table->text('note')->nullable();
            $table->tinyInteger('status')->default(1)->index()->comment('1=Completed, 2=Refunded, 3=Pending, 4=Confirmed, 5=Processing, 6=On Hold, 7=Cancelled');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
