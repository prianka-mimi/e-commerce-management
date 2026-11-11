<?php

use App\Http\Controllers\AdminOverviewController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\CustomerOrderController;
use App\Http\Controllers\CustomerShopController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ShopProductController;
use App\Http\Controllers\UploadController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Application & SPA Endpoints
|--------------------------------------------------------------------------
*/
Route::prefix('ajax')->group(function () {
    Route::get('csrf', [AuthController::class, 'csrf'])->name('ajax.csrf');

    // Authentication & Password Recovery (Shared for all roles)
    Route::post('login', [AuthController::class, 'login'])->name('ajax.login');
    Route::post('register', [AuthController::class, 'register'])->name('ajax.register');
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->name('ajax.forgot-password');
    Route::post('verify-forgot-otp', [AuthController::class, 'verifyForgotOtp'])->name('ajax.verify-forgot-otp');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->name('ajax.reset-password');

    // Public Customer Storefront
    Route::prefix('customer')->name('ajax.customer.')->group(function () {
        Route::get('shops', [CustomerShopController::class, 'shops'])->name('shops');
        Route::get('shops/{companyId}', [CustomerShopController::class, 'shopDetail'])->name('shops.show');
        Route::get('shops/{companyId}/products', [CustomerShopController::class, 'shopProducts'])->name('shop.products');
        Route::get('shops/{companyId}/products/{shopProductId}', [CustomerShopController::class, 'showShopProduct'])->name('shop.product.show');
        Route::get('featured-products', [CustomerShopController::class, 'featuredProducts'])->name('featured.products');
        Route::post('checkout', [CustomerOrderController::class, 'checkout'])->name('checkout');
    });

    // Authenticated Application Routes (Admin, Owner, Customer)
    Route::middleware(['auth:sanctum', 'company'])->group(function () {
        Route::post('update-profile', [ProfileController::class, 'updateProfile'])->name('ajax.update-profile');
        Route::post('change-password', [AuthController::class, 'changePassword'])->name('ajax.change-password');
        Route::post('email-change/send-otp', [AuthController::class, 'sendEmailChangeOtp'])->name('ajax.email-change.send-otp');
        Route::post('email-change/verify', [AuthController::class, 'verifyEmailChange'])->name('ajax.email-change.verify');
        Route::post('logout', [AuthController::class, 'logout'])->name('ajax.logout');
        Route::post('upload/chunk', [UploadController::class, 'chunk'])->name('ajax.upload.chunk');

        // Admin Exclusive Routes
        Route::middleware(['role:Admin'])->group(function () {
            Route::get('admin/overview', [AdminOverviewController::class, 'index'])->name('ajax.admin.overview');
            Route::post('user/{user}/reset-password', [UserController::class, 'resetPassword'])->name('ajax.user.reset-password');
            Route::apiResource('user', UserController::class)->only(['index', 'store', 'update', 'destroy'])->names('ajax.user');
            Route::post('company', [CompanyController::class, 'store'])->name('ajax.company.store');
            Route::delete('company/{company}', [CompanyController::class, 'destroy'])->name('ajax.company.destroy');
        });

        // Admin & Shop Owner Portal Routes
        Route::middleware(['role:Admin|Owner'])->group(function () {
            Route::get('company', [CompanyController::class, 'index'])->name('ajax.company.index');
            Route::get('company/{company}', [CompanyController::class, 'show'])->name('ajax.company.show');
            Route::match(['put', 'patch'], 'company/{company}', [CompanyController::class, 'update'])->name('ajax.company.update');

            Route::apiResource('product', ProductController::class)->only(['index', 'store', 'update', 'destroy'])->names('ajax.product');
            Route::get('shop-product/catalog', [ShopProductController::class, 'catalog'])->name('ajax.shop-product.catalog');
            Route::apiResource('shop-product', ShopProductController::class)->only(['index', 'store', 'update', 'destroy'])->names('ajax.shop-product');
            Route::apiResource('order', OrderController::class)->only(['index', 'update'])->names('ajax.order');
        });
    });
});

// Serves the compiled React SPA shell for client-side routes on direct navigation/reload
Route::get('/{any?}', function () {
    return view('spa');
})->where('any', '^(?!ajax|up|storage).*$')->name('spa');
