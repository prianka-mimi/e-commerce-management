<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Order;
use App\Models\Product;
use App\Models\ShopProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class MarketplaceWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (['Admin', 'Owner', 'Customer'] as $role) {
            Role::firstOrCreate(['name' => $role]);
        }
    }

    private function createUserWithRole(string $role, ?int $companyId = null, array $overrides = []): User
    {
        $user = User::factory()->create(array_merge([
            'company_id' => $companyId,
            'password' => Hash::make('12345678'),
            'status' => User::STATUS_ACTIVE,
        ], $overrides));

        $user->assignRole($role);

        return $user;
    }

    private function createShopForOwner(User $owner, string $name = 'Demo Shop', int $status = Company::STATUS_ACTIVE): Company
    {
        $shop = Company::create([
            'user_id' => $owner->id,
            'name' => $name,
            'email' => fake()->unique()->companyEmail(),
            'status' => $status,
        ]);

        $owner->update(['company_id' => $shop->id]);

        return $shop;
    }

    public function test_public_registration_rejects_admin_and_allows_customer_and_owner(): void
    {
        $adminAttempt = $this->postJson('/ajax/register', [
            'name' => 'Privilege Escalation',
            'email' => 'hacker@example.com',
            'password' => 'secret123',
            'role' => 'Admin',
        ]);

        $adminAttempt->assertStatus(422);
        $this->assertDatabaseMissing('users', ['email' => 'hacker@example.com']);

        $customerRes = $this->postJson('/ajax/register', [
            'name' => 'Jane Buyer',
            'email' => 'jane@example.com',
            'password' => 'secret123',
            'role' => 'customer',
        ]);

        $customerRes->assertStatus(201)
            ->assertJsonPath('status', true)
            ->assertJsonPath('data.user.role.0', 'Customer');

        $sellerRes = $this->postJson('/ajax/register', [
            'name' => 'Alex Merchant',
            'email' => 'alex@example.com',
            'password' => 'secret123',
            'role' => 'seller',
            'shop_name' => 'Alex Tech Store',
        ]);

        $sellerRes->assertStatus(201)
            ->assertJsonPath('data.user.role.0', 'Owner');

        $this->assertDatabaseHas('companies', ['name' => 'Alex Tech Store']);
    }

    public function test_rbac_and_owner_tenant_isolation(): void
    {
        $ownerA = $this->createUserWithRole('Owner');
        $shopA = $this->createShopForOwner($ownerA, 'Shop Alpha');

        $ownerB = $this->createUserWithRole('Owner');
        $shopB = $this->createShopForOwner($ownerB, 'Shop Beta');

        $customerUser = $this->createUserWithRole('Customer');

        $productB = Product::create([
            'name' => 'Beta Studio Mic',
            'sku' => 'BETA-MIC-01',
            'price' => 120.00,
            'stock' => 15,
            'status' => Product::STATUS_ACTIVE,
            'company_id' => $shopB->id,
            'created_by' => $ownerB->id,
        ]);

        $listingB = ShopProduct::create([
            'company_id' => $shopB->id,
            'product_id' => $productB->id,
            'price' => 110.00,
            'status' => ShopProduct::STATUS_ACTIVE,
        ]);

        // Customer cannot access management endpoints
        $this->actingAs($customerUser, 'sanctum')
            ->getJson('/ajax/admin/overview')
            ->assertStatus(403);

        $this->actingAs($customerUser, 'sanctum')
            ->getJson('/ajax/product')
            ->assertStatus(403);

        // Owner cannot access Admin-only endpoints
        $this->actingAs($ownerA, 'sanctum')
            ->getJson('/ajax/admin/overview')
            ->assertStatus(403);

        $this->actingAs($ownerA, 'sanctum')
            ->getJson('/ajax/user')
            ->assertStatus(403);

        $this->actingAs($ownerA, 'sanctum')
            ->postJson('/ajax/company', ['name' => 'Unauthorized Shop'])
            ->assertStatus(403);

        // Owner A cannot modify Owner B's catalog product or shop listing
        $this->actingAs($ownerA, 'sanctum')
            ->putJson("/ajax/product/{$productB->id}", [
                'name' => 'Hijacked',
                'sku' => 'BETA-MIC-01',
                'price' => 1,
                'stock' => 1,
            ])
            ->assertStatus(403);

        $this->actingAs($ownerA, 'sanctum')
            ->putJson("/ajax/shop-product/{$listingB->id}", ['price' => 5])
            ->assertStatus(403);

        // Spoofing company_id during ShopProduct creation assigns strictly to Owner A's shop
        $assignRes = $this->actingAs($ownerA, 'sanctum')
            ->postJson('/ajax/shop-product', [
                'company_id' => $shopB->id,
                'product_id' => $productB->id,
                'price' => 99.99,
            ]);

        $assignRes->assertStatus(201)
            ->assertJsonPath('data.company_id', $shopA->id);

        // Unauthenticated customer order show endpoint was removed
        $this->getJson('/ajax/customer/orders/1')->assertStatus(404);
    }

    public function test_unconstrained_image_uploads_and_clearing_nullable_fields(): void
    {
        Storage::fake('public');

        $admin = $this->createUserWithRole('Admin');
        $owner = $this->createUserWithRole('Owner');
        $shop = $this->createShopForOwner($owner, 'Upload Merchant');

        // Shop creation with multi-MB logo upload
        $logoFile = UploadedFile::fake()->create('shop-banner.png', 3072, 'image/png');
        $shopRes = $this->actingAs($admin, 'sanctum')->post('/ajax/company', [
            'name' => 'Visual Goods Store',
            'logo' => $logoFile,
        ], ['Accept' => 'application/json']);

        $shopRes->assertStatus(201);
        $logoUrl = $shopRes->json('data.logo');
        $this->assertStringStartsWith('/storage/', (string) $logoUrl);
        $relativeLogoPath = str_replace('/storage/', '', (string) $logoUrl);
        Storage::disk('public')->assertExists($relativeLogoPath);

        // Product creation with photo + nullable fields, then clearing nullable fields to null
        $photoFile = UploadedFile::fake()->create('product-shot.jpg', 4096, 'image/jpeg');
        $prodRes = $this->actingAs($admin, 'sanctum')->post('/ajax/product', [
            'name' => 'Studio Headphones',
            'sku' => 'HDPH-001',
            'price' => '199.99',
            'cost' => '110.00',
            'stock' => '25',
            'description' => 'Initial catalog notes',
            'photo' => $photoFile,
        ], ['Accept' => 'application/json']);

        $prodRes->assertStatus(201);
        $productId = $prodRes->json('data.id');
        $this->assertEquals(110.0, $prodRes->json('data.cost'));

        $clearRes = $this->actingAs($admin, 'sanctum')->post("/ajax/product/{$productId}", [
            '_method' => 'PUT',
            'name' => 'Studio Headphones',
            'sku' => 'HDPH-001',
            'price' => '199.99',
            'cost' => '',
            'stock' => '25',
            'description' => '',
        ], ['Accept' => 'application/json']);

        $clearRes->assertStatus(200);
        $this->assertNull($clearRes->json('data.cost'));
        $this->assertNull($clearRes->json('data.description'));

        // ShopProduct thumbnail upload + clearing shop price override back to catalog base price
        $thumbFile = UploadedFile::fake()->create('thumb.webp', 2048, 'image/webp');
        $spRes = $this->actingAs($owner, 'sanctum')->post('/ajax/shop-product', [
            'product_id' => $productId,
            'price' => '149.50',
            'description' => 'Custom warranty',
            'thumbnail' => $thumbFile,
        ], ['Accept' => 'application/json']);

        $spRes->assertStatus(201)
            ->assertJsonPath('data.effective_price', 149.5);
        $spId = $spRes->json('data.id');

        // Duplicate assignment blocked with clean 422 error
        $this->actingAs($owner, 'sanctum')->postJson('/ajax/shop-product', [
            'product_id' => $productId,
        ])->assertStatus(422);

        // Clearing shop price override reverts effective_price back to catalog base price
        $clearOverrideRes = $this->actingAs($owner, 'sanctum')->post("/ajax/shop-product/{$spId}", [
            '_method' => 'PUT',
            'price' => '',
            'description' => '',
            'status' => '1',
        ], ['Accept' => 'application/json']);

        $clearOverrideRes->assertStatus(200);
        $this->assertNull($clearOverrideRes->json('data.shop_price'));
        $this->assertEquals(199.99, $clearOverrideRes->json('data.effective_price'));

        // Chunked upload bypasses ini upload_max_filesize & attaches cleanly + title override updates storefront
        $pngHeader = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');
        $largeBinary = $pngHeader.str_repeat("\x00", 2 * 1024 * 1024); // > 2048 KiB total payload
        $chunks = str_split($largeBinary, 512 * 1024);
        $uploadId = (string) Str::uuid();
        $chunkStoredPath = null;

        foreach ($chunks as $idx => $chunkBytes) {
            $chunkRes = $this->actingAs($owner, 'sanctum')->postJson('/ajax/upload/chunk', [
                'upload_id' => $uploadId,
                'chunk_index' => $idx,
                'total_chunks' => count($chunks),
                'filename' => 'large-8k-preview.png',
                'directory' => 'uploads/shop_products',
                'data' => base64_encode($chunkBytes),
            ])->assertStatus(200);

            if ($idx === count($chunks) - 1) {
                $chunkRes->assertJsonPath('data.completed', true);
                $chunkStoredPath = $chunkRes->json('data.path');
            }
        }

        $this->assertNotNull($chunkStoredPath);
        Storage::disk('public')->assertExists($chunkStoredPath);

        $titleAndChunkRes = $this->actingAs($owner, 'sanctum')->post("/ajax/shop-product/{$spId}", [
            '_method' => 'PUT',
            'name' => 'Studio Headphones - Shop Exclusive Title',
            'price' => '179.00',
            'thumbnail' => $chunkStoredPath,
            'status' => '1',
        ], ['Accept' => 'application/json'])->assertStatus(200);

        $titleAndChunkRes
            ->assertJsonPath('data.name', 'Studio Headphones - Shop Exclusive Title')
            ->assertJsonPath('data.base_name', 'Studio Headphones')
            ->assertJsonPath('data.thumbnail', '/storage/'.$chunkStoredPath);

        // Master catalog product retains original title while customer storefront displays shop-specific title
        $this->assertEquals('Studio Headphones', Product::findOrFail($productId)->name);
        $this->getJson("/ajax/customer/shops/{$shop->id}/products/{$spId}")
            ->assertStatus(200)
            ->assertJsonPath('data.name', 'Studio Headphones - Shop Exclusive Title');
    }

    public function test_shared_catalog_visibility_and_checkout_decrements_stock(): void
    {
        $owner = $this->createUserWithRole('Owner');
        $shop = $this->createShopForOwner($owner, 'Tech Storefront');

        $assignedCatalogProduct = Product::create([
            'name' => 'Assigned Mechanical Keyboard',
            'sku' => 'KEY-ASSIGNED',
            'price' => 150.00,
            'stock' => 5,
            'status' => Product::STATUS_ACTIVE,
        ]);

        $unassignedCatalogProduct = Product::create([
            'name' => 'Hidden Unassigned Product',
            'sku' => 'KEY-UNASSIGNED',
            'price' => 99.00,
            'stock' => 10,
            'status' => Product::STATUS_ACTIVE,
        ]);

        $shopProduct = ShopProduct::create([
            'company_id' => $shop->id,
            'product_id' => $assignedCatalogProduct->id,
            'price' => 129.99,
            'description' => 'Store-exclusive keycaps edition',
            'status' => ShopProduct::STATUS_ACTIVE,
        ]);

        // Unassigned product must NEVER be visible to customers
        $featuredRes = $this->getJson('/ajax/customer/featured-products');
        $featuredRes->assertStatus(200);
        $names = collect($featuredRes->json('data.data'))->pluck('name')->all();
        $this->assertContains('Assigned Mechanical Keyboard', $names);
        $this->assertNotContains('Hidden Unassigned Product', $names);

        // Customer detail shows store override price & exact stock
        $this->getJson("/ajax/customer/shops/{$shop->id}/products/{$shopProduct->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.price', 129.99)
            ->assertJsonPath('data.stock', 5);

        // Catalog endpoint flags already-assigned status cleanly for Owner
        $catalogRes = $this->actingAs($owner, 'sanctum')->getJson('/ajax/shop-product/catalog');
        $catalogRes->assertStatus(200);
        $catalogMap = collect($catalogRes->json('data.data'))->keyBy('sku');
        $this->assertTrue($catalogMap['KEY-ASSIGNED']['is_assigned']);
        $this->assertFalse($catalogMap['KEY-UNASSIGNED']['is_assigned']);

        // Over-ordering beyond stock fails cleanly with 422
        $this->postJson('/ajax/customer/checkout', [
            'name' => 'Buyer One',
            'email' => 'buyer1@example.com',
            'phone' => '01711111111',
            'address' => '123 Market St',
            'items' => [
                ['shop_product_id' => $shopProduct->id, 'quantity' => 6],
            ],
        ])->assertStatus(422);

        // Valid card checkout by authenticated buyer creates Order + decrements stock atomically
        $buyer = $this->createUserWithRole('Customer', null, ['email' => 'buyer1@example.com']);
        $checkoutRes = $this->actingAs($buyer, 'sanctum')->postJson('/ajax/customer/checkout', [
            'name' => 'Buyer One',
            'email' => 'buyer1@example.com',
            'phone' => '01711111111',
            'address' => '123 Market St',
            'payment_method' => 'card',
            'items' => [
                ['shop_product_id' => $shopProduct->id, 'quantity' => 2],
            ],
        ]);

        $checkoutRes->assertStatus(201)
            ->assertJsonPath('data.total_amount', 259.98)
            ->assertJsonPath('data.payment_method', Order::PAYMENT_CARD)
            ->assertJsonPath('data.payment_method_name', 'Card');

        $this->assertEquals(3, $assignedCatalogProduct->fresh()->stock);
        $this->assertDatabaseHas('orders', [
            'company_id' => $shop->id,
            'user_id' => $buyer->id,
            'payment_method' => Order::PAYMENT_CARD,
            'total_amount' => 259.98,
        ]);

        // Second shop sharing the same catalog product sees decremented stock & decrements further cleanly
        $ownerTwo = $this->createUserWithRole('Owner');
        $shopTwo = $this->createShopForOwner($ownerTwo, 'Gadget Outlet');
        $secondListing = ShopProduct::create([
            'company_id' => $shopTwo->id,
            'product_id' => $assignedCatalogProduct->id,
            'price' => 140.00,
            'status' => ShopProduct::STATUS_ACTIVE,
        ]);

        // Buying 2 across Shop 1 + 2 across Shop 2 exceeds remaining 3 stock -> must fail cleanly with 0 decrement
        $this->postJson('/ajax/customer/checkout', [
            'name' => 'Buyer Two',
            'email' => 'buyer2@example.com',
            'phone' => '01722222222',
            'address' => '456 Commerce Ave',
            'items' => [
                ['shop_product_id' => $shopProduct->id, 'quantity' => 2],
                ['shop_product_id' => $secondListing->id, 'quantity' => 2],
            ],
        ])->assertStatus(422);
        $this->assertEquals(3, $assignedCatalogProduct->fresh()->stock);

        // Buying remaining 3 across both shops decrements stock cleanly down to 0
        $this->postJson('/ajax/customer/checkout', [
            'name' => 'Buyer Two',
            'email' => 'buyer2@example.com',
            'phone' => '01722222222',
            'address' => '456 Commerce Ave',
            'payment_method' => 'cod',
            'items' => [
                ['shop_product_id' => $shopProduct->id, 'quantity' => 1],
                ['shop_product_id' => $secondListing->id, 'quantity' => 2],
            ],
        ])->assertStatus(201);
        $this->assertEquals(0, $assignedCatalogProduct->fresh()->stock);
    }

    public function test_pagination_defaults_to_twenty_items_per_page(): void
    {
        $admin = $this->createUserWithRole('Admin');
        $owner = $this->createUserWithRole('Owner');
        $shop = $this->createShopForOwner($owner, 'Volume Store');

        for ($i = 1; $i <= 21; $i++) {
            $product = Product::create([
                'name' => "Catalog Item {$i}",
                'sku' => "PAG-SKU-{$i}",
                'price' => 10 + $i,
                'stock' => 20,
                'status' => Product::STATUS_ACTIVE,
            ]);

            ShopProduct::create([
                'company_id' => $shop->id,
                'product_id' => $product->id,
                'status' => ShopProduct::STATUS_ACTIVE,
            ]);
        }

        $this->actingAs($admin, 'sanctum')
            ->getJson('/ajax/product')
            ->assertStatus(200)
            ->assertJsonPath('data.meta.per_page', 20)
            ->assertJsonPath('data.meta.total', 21)
            ->assertJsonPath('data.meta.last_page', 2);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/ajax/shop-product')
            ->assertStatus(200)
            ->assertJsonPath('data.meta.per_page', 20)
            ->assertJsonPath('data.meta.total', 21)
            ->assertJsonPath('data.meta.last_page', 2);

        $this->getJson('/ajax/customer/featured-products')
            ->assertStatus(200)
            ->assertJsonPath('data.meta.per_page', 20)
            ->assertJsonPath('data.meta.total', 21)
            ->assertJsonPath('data.meta.last_page', 2);
    }

    public function test_admin_overview_kpis_latest_orders_user_update_and_password_reset(): void
    {
        $admin = $this->createUserWithRole('Admin');
        $owner = $this->createUserWithRole('Owner');
        $shop = $this->createShopForOwner($owner, 'Overview Shop');
        $targetUser = $this->createUserWithRole('Customer', null, [
            'email' => 'member@example.com',
        ]);

        // Admin edits role -> Owner with shop, then unassigns shop
        $this->actingAs($admin, 'sanctum')
            ->postJson("/ajax/user/{$targetUser->id}", [
                '_method' => 'PUT',
                'name' => 'Member Updated',
                'email' => 'member@example.com',
                'role' => 'Owner',
                'company_id' => $shop->id,
                'status' => 1,
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.company_id', $shop->id);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/ajax/user/{$targetUser->id}", [
                '_method' => 'PUT',
                'name' => 'Member Updated',
                'email' => 'member@example.com',
                'role' => 'Customer',
                'company_id' => '',
                'status' => 1,
            ])
            ->assertStatus(200);

        $this->assertNull($targetUser->fresh()->company_id);
        $this->assertTrue($targetUser->fresh()->hasRole('Customer'));

        // Admin resets password to 12345678
        $this->actingAs($admin, 'sanctum')
            ->postJson("/ajax/user/{$targetUser->id}/reset-password")
            ->assertStatus(200);

        $this->postJson('/ajax/login', [
            'email' => 'member@example.com',
            'password' => '12345678',
        ])->assertStatus(200);

        // Seed 7 orders and verify overview caps latest_orders at 6 with itemized details & 5 KPIs
        $product = Product::create([
            'name' => 'Overview Widget',
            'sku' => 'OVW-1',
            'price' => 50.00,
            'stock' => 100,
            'status' => Product::STATUS_ACTIVE,
        ]);

        $shopProduct = ShopProduct::create([
            'company_id' => $shop->id,
            'product_id' => $product->id,
            'status' => ShopProduct::STATUS_ACTIVE,
        ]);

        for ($i = 1; $i <= 7; $i++) {
            $this->postJson('/ajax/customer/checkout', [
                'name' => "Buyer {$i}",
                'email' => "buyer{$i}@example.com",
                'phone' => "0170000000{$i}",
                'address' => 'Test Address',
                'items' => [
                    ['shop_product_id' => $shopProduct->id, 'quantity' => 1],
                ],
            ])->assertStatus(201);
        }

        $overviewRes = $this->actingAs($admin, 'sanctum')
            ->getJson('/ajax/admin/overview')
            ->assertStatus(200);

        $metrics = $overviewRes->json('data.metrics');
        $this->assertArrayNotHasKey('total_category', $metrics);
        $this->assertArrayNotHasKey('total_categories', $metrics);
        $this->assertEquals(1, $metrics['total_shops']);
        $this->assertEquals(1, $metrics['total_sellers']);
        $this->assertEquals(7, $metrics['total_buyers']);
        $this->assertEquals(1, $metrics['total_products']);
        $this->assertEquals(1, $metrics['total_catalog']);

        $latestOrders = $overviewRes->json('data.latest_orders');
        $this->assertCount(6, $latestOrders);
        $this->assertNotEmpty($latestOrders[0]['items']);
        $this->assertEquals('Overview Widget', $latestOrders[0]['items'][0]['product_name']);
        $this->assertEquals(7, Order::count());

        // Orders API exposes itemized orders with payment_method_name for Admin & scoped Owner
        $adminOrdersRes = $this->actingAs($admin, 'sanctum')
            ->getJson('/ajax/order')
            ->assertStatus(200)
            ->assertJsonPath('data.meta.total', 7)
            ->assertJsonPath('data.data.0.payment_method_name', 'Cash on Delivery');

        $firstOrderId = $adminOrdersRes->json('data.data.0.id');

        $this->actingAs($owner, 'sanctum')
            ->getJson('/ajax/order')
            ->assertStatus(200)
            ->assertJsonPath('data.meta.total', 7)
            ->assertJsonPath('data.data.0.items.0.product_name', 'Overview Widget');

        $this->actingAs($owner, 'sanctum')
            ->putJson("/ajax/order/{$firstOrderId}", ['status' => Order::STATUS_CONFIRMED])
            ->assertStatus(200)
            ->assertJsonPath('data.status', Order::STATUS_CONFIRMED)
            ->assertJsonPath('data.status_text', 'Confirmed');
    }

    public function test_customer_profile_password_change_and_forgot_password_flows(): void
    {
        Storage::fake('public');

        // Legacy routes/api.php and App\Http\Controllers\Api directory should no longer exist
        $this->assertFileDoesNotExist(base_path('routes/api.php'));
        $this->assertDirectoryDoesNotExist(app_path('Http/Controllers/Api'));

        $customer = $this->createUserWithRole('Customer', null, [
            'name' => 'Test Buyer',
            'email' => 'customer@example.com',
        ]);

        // Unset photo returns null rather than a fake generated avatar URL
        $this->assertNull($customer->avatarUrl());

        // Customer cannot upload into admin/owner directories
        $pngHeader = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');
        $this->actingAs($customer, 'sanctum')->postJson('/ajax/upload/chunk', [
            'upload_id' => (string) Str::uuid(),
            'chunk_index' => 0,
            'total_chunks' => 1,
            'filename' => 'forbidden.png',
            'directory' => 'uploads/products',
            'data' => base64_encode($pngHeader),
        ])->assertStatus(403);

        // Customer uploads avatar into uploads/users via chunk endpoint and updates profile
        $avatarChunkRes = $this->actingAs($customer, 'sanctum')->postJson('/ajax/upload/chunk', [
            'upload_id' => (string) Str::uuid(),
            'chunk_index' => 0,
            'total_chunks' => 1,
            'filename' => 'avatar.png',
            'directory' => 'uploads/users',
            'data' => base64_encode($pngHeader),
        ])->assertStatus(200);

        $avatarPath = $avatarChunkRes->json('data.path');
        Storage::disk('public')->assertExists($avatarPath);

        // Direct profile update cannot bypass email OTP verification
        $this->actingAs($customer, 'sanctum')->postJson('/ajax/update-profile', [
            'name' => 'Updated Buyer Name',
            'email' => 'bypass@example.com',
            'phone' => '01799999999',
            'photo' => $avatarPath,
        ])->assertStatus(200)
            ->assertJsonPath('data.name', 'Updated Buyer Name')
            ->assertJsonPath('data.email', 'customer@example.com')
            ->assertJsonPath('data.photo', '/storage/'.$avatarPath);

        // Email change requires verifying current email with 6-digit OTP first
        $this->actingAs($customer, 'sanctum')->postJson('/ajax/email-change/send-otp', [
            'current_email' => 'wrong@example.com',
        ])->assertStatus(422);

        $emailOtpRes = $this->actingAs($customer, 'sanctum')->postJson('/ajax/email-change/send-otp', [
            'current_email' => 'customer@example.com',
        ])->assertStatus(200);

        $emailOtp = $emailOtpRes->json('data.local_otp');
        $this->assertMatchesRegularExpression('/^\d{6}$/', (string) $emailOtp);

        $this->actingAs($customer, 'sanctum')->postJson('/ajax/email-change/verify', [
            'otp' => '000000',
            'new_email' => 'updated.customer@example.com',
        ])->assertStatus(422);

        $this->actingAs($customer, 'sanctum')->postJson('/ajax/email-change/verify', [
            'otp' => $emailOtp,
            'new_email' => 'updated.customer@example.com',
        ])->assertStatus(200)
            ->assertJsonPath('data.email', 'updated.customer@example.com');

        // Wrong current password rejected; valid current password updates hash
        $this->actingAs($customer, 'sanctum')->postJson('/ajax/change-password', [
            'old_password' => 'wrongpass',
            'new_password' => 'newpass123',
        ])->assertStatus(422);

        $this->actingAs($customer, 'sanctum')->postJson('/ajax/change-password', [
            'old_password' => '12345678',
            'new_password' => 'newpass123',
        ])->assertStatus(200);

        // Forgot password 3-step OTP flow works for any role on shared auth endpoints
        $forgotRes = $this->postJson('/ajax/forgot-password', [
            'email' => 'updated.customer@example.com',
        ])->assertStatus(200);

        $forgotOtp = $forgotRes->json('data.local_otp');
        $this->assertMatchesRegularExpression('/^\d{6}$/', (string) $forgotOtp);

        $this->postJson('/ajax/verify-forgot-otp', [
            'email' => 'updated.customer@example.com',
            'otp' => '000000',
        ])->assertStatus(422);

        $verifyOtpRes = $this->postJson('/ajax/verify-forgot-otp', [
            'email' => 'updated.customer@example.com',
            'otp' => $forgotOtp,
        ])->assertStatus(200);

        $resetToken = $verifyOtpRes->json('data.reset_token');
        $this->assertNotEmpty($resetToken);

        $this->postJson('/ajax/reset-password', [
            'email' => 'updated.customer@example.com',
            'reset_token' => $resetToken,
            'password' => 'resetpass999',
            'password_confirmation' => 'resetpass999',
        ])->assertStatus(200);

        $this->postJson('/ajax/login', [
            'email' => 'updated.customer@example.com',
            'password' => 'resetpass999',
        ])->assertStatus(200)
            ->assertJsonPath('data.user.name', 'Updated Buyer Name');
    }

    public function test_otp_emails_dispatch_via_mailer_and_roll_back_on_transport_failure(): void
    {
        $customer = $this->createUserWithRole('Customer', null, [
            'name' => 'Mailer Buyer',
            'email' => 'mailer@example.com',
        ]);

        config(['mail.default' => 'array']);
        Mail::mailer('array')->getSymfonyTransport()->flush();

        $forgotRes = $this->postJson('/ajax/forgot-password', [
            'email' => 'mailer@example.com',
        ])->assertStatus(200);

        $forgotOtp = (string) $forgotRes->json('data.local_otp');
        $sentForgot = Mail::mailer('array')->getSymfonyTransport()->messages();
        $this->assertCount(1, $sentForgot);
        $this->assertStringContainsString($forgotOtp, $sentForgot[0]->getOriginalMessage()->getTextBody());
        $this->assertSame('Password Reset OTP', $sentForgot[0]->getOriginalMessage()->getSubject());

        Mail::mailer('array')->getSymfonyTransport()->flush();

        $emailOtpRes = $this->actingAs($customer, 'sanctum')->postJson('/ajax/email-change/send-otp', [
            'current_email' => 'mailer@example.com',
        ])->assertStatus(200);

        $emailOtp = (string) $emailOtpRes->json('data.local_otp');
        $sentEmailChange = Mail::mailer('array')->getSymfonyTransport()->messages();
        $this->assertCount(1, $sentEmailChange);
        $this->assertStringContainsString($emailOtp, $sentEmailChange[0]->getOriginalMessage()->getTextBody());
        $this->assertSame('Email Change Verification OTP', $sentEmailChange[0]->getOriginalMessage()->getSubject());

        // When configured to a real mailer (e.g. smtp), OTP is never leaked in API payload and transport failure rolls back
        DB::table('password_reset_tokens')->delete();
        Cache::forget("email_change_otp:{$customer->id}");
        config(['mail.default' => 'smtp']);

        Mail::shouldReceive('raw')
            ->once()
            ->andReturnNull();

        $smtpSuccess = $this->postJson('/ajax/forgot-password', [
            'email' => 'mailer@example.com',
        ])->assertStatus(200);
        $this->assertNull($smtpSuccess->json('data.local_otp'));

        Mail::shouldReceive('raw')
            ->twice()
            ->andThrow(new RuntimeException('SMTP connection refused'));

        $this->postJson('/ajax/forgot-password', [
            'email' => 'mailer@example.com',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
        $this->assertNull(DB::table('password_reset_tokens')->where('email', 'mailer@example.com')->first());

        $this->actingAs($customer, 'sanctum')->postJson('/ajax/email-change/send-otp', [
            'current_email' => 'mailer@example.com',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
        $this->assertNull(Cache::get("email_change_otp:{$customer->id}"));
    }
}
