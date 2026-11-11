<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Product;
use App\Models\ShopProduct;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class EcommerceDemoSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Ensure Roles exist
        Role::firstOrCreate(['name' => 'Admin']);
        Role::firstOrCreate(['name' => 'Owner']);
        Role::firstOrCreate(['name' => 'Customer']);

        // 2. Admin user (admin@admin.com with password: 12345678)
        $admin = User::firstOrCreate(
            ['email' => 'admin@admin.com'],
            [
                'name' => 'Admin',
                'phone' => '01700000000',
                'password' => Hash::make('12345678'),
                'status' => User::STATUS_ACTIVE,
            ]
        );
        $admin->password = Hash::make('12345678');
        $admin->status = User::STATUS_ACTIVE;
        $admin->save();
        if (! $admin->hasRole('Admin')) {
            $admin->assignRole('Admin');
        }

        // Helper to provision shop owner
        $createOwner = function (string $name, string $email, string $phone) {
            $u = User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'phone' => $phone,
                    'password' => Hash::make('12345678'),
                    'status' => User::STATUS_ACTIVE,
                ]
            );
            $u->password = Hash::make('12345678');
            $u->status = User::STATUS_ACTIVE;
            $u->save();
            if (! $u->hasRole('Owner')) {
                $u->assignRole('Owner');
            }

            return $u;
        };

        // 3. Certified Shops (8 Stores)
        $owner1 = $createOwner('John Shopkeeper', 'owner@shop.com', '01900000001');
        $shop1 = Company::updateOrCreate(
            ['name' => 'TechVerse Electronics'],
            [
                'user_id' => $owner1->id,
                'email' => 'support@techverse.com',
                'phone' => '01900000001',
                'address' => '42 Silicon Avenue, Tech City',
                'website' => 'techverse.store',
                'logo' => 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400&auto=format&fit=crop&q=80',
                'status' => Company::STATUS_ACTIVE,
                'sort_description' => 'Premium audiophile gear, 4K displays, and smart gadgets.',
                'description' => 'Curated audio, monitors, and gaming essentials with official warranty and express fulfillment.',
                'is_default' => Company::IS_DEFAULT,
            ]
        );
        $owner1->update(['company_id' => $shop1->id]);

        $owner2 = $createOwner('Sarah Jenkins', 'sarah@gearshop.com', '01900000002');
        $shop2 = Company::updateOrCreate(
            ['name' => 'Gear & Gadgets Hub'],
            [
                'user_id' => $owner2->id,
                'email' => 'contact@gearhub.com',
                'phone' => '01900000002',
                'address' => '88 Commerce Street, Metropolis',
                'website' => 'gearhub.store',
                'logo' => 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&auto=format&fit=crop&q=80',
                'status' => Company::STATUS_ACTIVE,
                'sort_description' => 'Smart lifestyle accessories, fast chargers, and daily essentials.',
                'description' => 'High speed charging gear, smart wearables, and mobile accessories with customer-first support.',
                'is_default' => 0,
            ]
        );
        $owner2->update(['company_id' => $shop2->id]);

        $owner3 = $createOwner('Elena Lindqvist', 'nordic@shop.com', '01900000003');
        $shop3 = Company::updateOrCreate(
            ['name' => 'Nordic Workspace & Living'],
            [
                'user_id' => $owner3->id,
                'email' => 'hello@nordicliving.store',
                'phone' => '01900000003',
                'address' => '14 Fjord Design Boulevard, New Port',
                'website' => 'nordicliving.store',
                'logo' => 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&auto=format&fit=crop&q=80',
                'status' => Company::STATUS_ACTIVE,
                'sort_description' => 'Scandinavian minimalist desk setups, risers, and felt pads.',
                'description' => 'Natural materials, sustainable wood, and precision ergonomics for focused professionals.',
                'is_default' => 0,
            ]
        );
        $owner3->update(['company_id' => $shop3->id]);

        $owner4 = $createOwner('Marcus Vance', 'apex@shop.com', '01900000004');
        $shop4 = Company::updateOrCreate(
            ['name' => 'Apex Performance Tech'],
            [
                'user_id' => $owner4->id,
                'email' => 'sales@apextech.store',
                'phone' => '01900000004',
                'address' => '77 Cyber Way, Metro District',
                'website' => 'apextech.store',
                'logo' => 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&auto=format&fit=crop&q=80',
                'status' => Company::STATUS_ACTIVE,
                'sort_description' => 'Esports mechanical keyboards, optics, and competitive gaming.',
                'description' => 'Tuned mechanical switches, low-latency wireless mice, and high refresh rate hardware.',
                'is_default' => 0,
            ]
        );
        $owner4->update(['company_id' => $shop4->id]);

        $owner5 = $createOwner('Chloe Davis', 'aura@shop.com', '01900000005');
        $shop5 = Company::updateOrCreate(
            ['name' => 'Aura Smart Lighting'],
            [
                'user_id' => $owner5->id,
                'email' => 'contact@auralighting.store',
                'phone' => '01900000005',
                'address' => '105 Radiant Park, Lumina City',
                'website' => 'auralighting.store',
                'logo' => 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&auto=format&fit=crop&q=80',
                'status' => Company::STATUS_ACTIVE,
                'sort_description' => 'Smart screenbars, ambient RGB strips, and studio lighting.',
                'description' => 'Circadian lighting solutions designed to protect your eyes and transform your workspace atmosphere.',
                'is_default' => 0,
            ]
        );
        $owner5->update(['company_id' => $shop5->id]);

        $owner6 = $createOwner('Julian Mercer', 'chronos@shop.com', '01900000006');
        $shop6 = Company::updateOrCreate(
            ['name' => 'Chronos Timepieces'],
            [
                'user_id' => $owner6->id,
                'email' => 'concierge@chronos.store',
                'phone' => '01900000006',
                'address' => '33 Heritage Row, Grand Square',
                'website' => 'chronos.store',
                'logo' => 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&auto=format&fit=crop&q=80',
                'status' => Company::STATUS_ACTIVE,
                'sort_description' => 'Precision GPS smartwatches, titanium cases, and sapphire glass.',
                'description' => 'Classic Swiss watchmaking aesthetics combined with cutting edge health and biometric technology.',
                'is_default' => 0,
            ]
        );
        $owner6->update(['company_id' => $shop6->id]);

        $owner7 = $createOwner('Liam Gallagher', 'studio@shop.com', '01900000007');
        $shop7 = Company::updateOrCreate(
            ['name' => 'Studio Pro Audio'],
            [
                'user_id' => $owner7->id,
                'email' => 'sound@studiopro.store',
                'phone' => '01900000007',
                'address' => '12 Soundwave Lane, Acoustic District',
                'website' => 'studiopro.store',
                'logo' => 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&auto=format&fit=crop&q=80',
                'status' => Company::STATUS_ACTIVE,
                'sort_description' => 'Studio condenser microphones, audio interfaces, and DACs.',
                'description' => 'Acoustic perfection for podcast creators, voice actors, music producers, and streamers.',
                'is_default' => 0,
            ]
        );
        $owner7->update(['company_id' => $shop7->id]);

        $owner8 = $createOwner('Sophia Bennett', 'urban@shop.com', '01900000008');
        $shop8 = Company::updateOrCreate(
            ['name' => 'Urban Carry Co.'],
            [
                'user_id' => $owner8->id,
                'email' => 'support@urbancarry.store',
                'phone' => '01900000008',
                'address' => '55 Transit Avenue, Central Station',
                'website' => 'urbancarry.store',
                'logo' => 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&auto=format&fit=crop&q=80',
                'status' => Company::STATUS_ACTIVE,
                'sort_description' => 'Water-resistant tech sleeves, EDC organizers, and travel packs.',
                'description' => 'Engineered tech protection bags crafted with weatherproof materials and padded interior dividers.',
                'is_default' => 0,
            ]
        );
        $owner8->update(['company_id' => $shop8->id]);

        $shops = [$shop1, $shop2, $shop3, $shop4, $shop5, $shop6, $shop7, $shop8];

        // 4. Catalog Products (45 Verified Consumer Tech & Workspace Products)
        $catalog = [
            [
                'sku' => 'PROD-AUDIO-01',
                'name' => 'Wireless Noise-Canceling Studio Headphones',
                'price' => 149.99,
                'cost' => 80.00,
                'stock' => 65,
                'photo' => 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
                'description' => 'Premium over-ear Bluetooth headphones featuring hybrid active noise cancellation, high-res audio drivers, and 40-hour battery life.',
            ],
            [
                'sku' => 'PROD-WATCH-02',
                'name' => 'Ultra AMOLED GPS Fitness Smartwatch',
                'price' => 199.99,
                'cost' => 110.00,
                'stock' => 45,
                'photo' => 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
                'description' => 'Waterproof 5ATM fitness smartwatch equipped with continuous heart-rate monitoring, SpO2 sensor, onboard GPS, and 12-day endurance.',
            ],
            [
                'sku' => 'PROD-POWER-03',
                'name' => '65W GaN Fast Charger (Multi-Port USB-C/A)',
                'price' => 39.99,
                'cost' => 18.00,
                'stock' => 120,
                'photo' => 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
                'description' => 'Pocket-sized GaN III fast charger featuring dual USB-C Power Delivery 3.0 ports and one USB-A Quick Charge port.',
            ],
            [
                'sku' => 'PROD-SPEAKER-04',
                'name' => 'Rugged Waterproof Bluetooth 360 Speaker',
                'price' => 59.99,
                'cost' => 28.00,
                'stock' => 85,
                'photo' => 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&auto=format&fit=crop&q=80',
                'description' => 'IPX7 waterproof portable speaker delivering dynamic 360-degree stereo sound, punchy bass, and 16 hours playback.',
            ],
            [
                'sku' => 'PROD-KEY-05',
                'name' => 'Custom Hot-Swappable Mechanical Keyboard 75%',
                'price' => 119.99,
                'cost' => 65.00,
                'stock' => 50,
                'photo' => 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
                'description' => 'Compact 75% mechanical keyboard with factory-lubed linear switches, sound-dampening foam, South-facing RGB, and multi-device Bluetooth.',
            ],
            [
                'sku' => 'PROD-MOUSE-06',
                'name' => 'Ergonomic Wireless Precision Productivity Mouse',
                'price' => 49.99,
                'cost' => 22.00,
                'stock' => 75,
                'photo' => 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80',
                'description' => 'Comfortable ergonomic vertical mouse designed to relieve wrist strain, with silent click switches and fast USB-C rechargeable battery.',
            ],
            [
                'sku' => 'PROD-MONITOR-07',
                'name' => 'Ultra-Wide 34-inch Curved IPS Gaming & Productivity Monitor',
                'price' => 499.99,
                'cost' => 320.00,
                'stock' => 30,
                'photo' => 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80',
                'description' => 'Immersive 144Hz WQHD curved panel featuring 99% sRGB color accuracy, HDR400, and integrated USB-C 90W power delivery.',
            ],
            [
                'sku' => 'PROD-MIC-08',
                'name' => 'Broadcast Studio Condenser USB Microphone with Shock Mount',
                'price' => 99.99,
                'cost' => 45.00,
                'stock' => 55,
                'photo' => 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
                'description' => 'Cardioid pickup condenser mic with built-in pop filter, zero-latency headphone monitoring, and tap-to-mute sensor.',
            ],
            [
                'sku' => 'PROD-CHARGEDOCK-09',
                'name' => 'MagSafe Qi2 3-in-1 Aluminum Fast Wireless Charging Station',
                'price' => 69.99,
                'cost' => 32.00,
                'stock' => 90,
                'photo' => 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&auto=format&fit=crop&q=80',
                'description' => 'Simultaneously charge iPhone, Apple Watch, and AirPods with 15W Qi2 fast magnetic alignment and aircraft-grade aluminum finish.',
            ],
            [
                'sku' => 'PROD-SLEEVE-10',
                'name' => 'Handcrafted Full-Grain Leather & Wool Laptop Sleeve',
                'price' => 45.00,
                'cost' => 18.00,
                'stock' => 80,
                'photo' => 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80',
                'description' => 'Tailored luxury sleeve for 14-16 inch laptops with magnetic closure, shock-absorbing felt lining, and scratch-resistant exterior.',
            ],
            [
                'sku' => 'PROD-WEBCAM-11',
                'name' => '4K Ultra HD Pro Streaming Webcam with Dual Noise-Canceling Mics',
                'price' => 89.99,
                'cost' => 40.00,
                'stock' => 65,
                'photo' => 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80',
                'description' => 'Auto-focus HDR 4K camera with integrated privacy shutter and intelligent face-tracking for crystal-clear conferences.',
            ],
            [
                'sku' => 'PROD-RISER-12',
                'name' => 'Aluminum Adjustable Ergonomic Laptop Stand with Heat Dissipation',
                'price' => 49.99,
                'cost' => 20.00,
                'stock' => 110,
                'photo' => 'https://images.unsplash.com/photo-1616353071855-2c045c4458ae?w=800&auto=format&fit=crop&q=80',
                'description' => 'Heavy-duty CNC machined aluminum riser with silicone anti-slip pads, 6-level angle adjustment, and foldable portability.',
            ],
            [
                'sku' => 'PROD-DESKMAT-13',
                'name' => 'Dual-Sided Eco Vegan Leather & Wool Felt Desk Mat 90x40cm',
                'price' => 32.99,
                'cost' => 12.00,
                'stock' => 130,
                'photo' => 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=800&auto=format&fit=crop&q=80',
                'description' => 'Large water-resistant desk protector pad with smooth mouse glide surface and precision non-fray stitched borders.',
            ],
            [
                'sku' => 'PROD-SCREENBAR-14',
                'name' => 'Smart Eye-Care ScreenBar Monitor Light Bar with Auto-Dimming',
                'price' => 64.99,
                'cost' => 26.00,
                'stock' => 95,
                'photo' => 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80',
                'description' => 'Asymmetric optical design prevents screen glare, featuring touch controls, 3 color temperatures, and ambient light sensing.',
            ],
            [
                'sku' => 'PROD-ORGANIZER-15',
                'name' => 'Solid Walnut & Anodized Aluminum Desktop Cable Organizer',
                'price' => 28.50,
                'cost' => 10.00,
                'stock' => 140,
                'photo' => 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80',
                'description' => 'Weighted non-slip base crafted from North American walnut keeps charging cables neatly routed and within reach.',
            ],
            [
                'sku' => 'PROD-EARBUDS-16',
                'name' => 'Spatial Audio ANC True Wireless Earbuds with Wireless Case',
                'price' => 129.99,
                'cost' => 58.00,
                'stock' => 70,
                'photo' => 'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=800&auto=format&fit=crop&q=80',
                'description' => 'Dynamic head tracking spatial audio, 42dB active noise canceling, transparency mode, and IPX5 sweat resistance.',
            ],
            [
                'sku' => 'PROD-DOCK-17',
                'name' => '11-in-1 Triple Display USB-C Hub & Docking Station 100W PD',
                'price' => 84.99,
                'cost' => 38.00,
                'stock' => 85,
                'photo' => 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=800&auto=format&fit=crop&q=80',
                'description' => 'Dual HDMI 4K@60Hz, Gigabit Ethernet, 10Gbps USB-C data, SD/TF card readers, and 100W pass-through charging.',
            ],
            [
                'sku' => 'PROD-LIGHTSTRIP-18',
                'name' => 'Ambient Smart RGBIC LED Lightstrip with Audio Reactive Sync',
                'price' => 35.99,
                'cost' => 14.00,
                'stock' => 100,
                'photo' => 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
                'description' => 'Segmented color control, 16 million colors, built-in mic for music synchronization, and WiFi/Bluetooth app control.',
            ],
            [
                'sku' => 'PROD-MACROKEY-19',
                'name' => 'Wireless Mechanical Mac Keyboard with White LED Backlight',
                'price' => 109.99,
                'cost' => 52.00,
                'stock' => 60,
                'photo' => 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&auto=format&fit=crop&q=80',
                'description' => 'Minimalist aluminum body layout optimized for macOS with tactile quiet switches and seamless Bluetooth device switching.',
            ],
            [
                'sku' => 'PROD-SPEAKERS-20',
                'name' => 'Hi-Fi Desktop Reference Monitor Speakers Pair',
                'price' => 189.99,
                'cost' => 95.00,
                'stock' => 40,
                'photo' => 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80',
                'description' => 'Studio tuned acoustic clarity with 4-inch Kevlar woofers, silk dome tweeters, and balanced TRS/RCA inputs.',
            ],
            [
                'sku' => 'PROD-DAC-21',
                'name' => 'High-Res Lossless Audio DAC & Balanced Headphone Amplifier',
                'price' => 139.99,
                'cost' => 70.00,
                'stock' => 35,
                'photo' => 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80',
                'description' => '32-bit/768kHz DSD512 hardware decoding delivers audiophile detail with ultra-low distortion and clean power output.',
            ],
            [
                'sku' => 'PROD-POWERBANK-22',
                'name' => 'Magnetic Wireless 10,000mAh Power Bank with Foldable Kickstand',
                'price' => 44.99,
                'cost' => 19.00,
                'stock' => 115,
                'photo' => 'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf?w=800&auto=format&fit=crop&q=80',
                'description' => 'Snap-on magnetic charging for iPhones with 20W PD USB-C fast wired charging and integrated hands-free viewing stand.',
            ],
            [
                'sku' => 'PROD-BACKPACK-23',
                'name' => 'Weatherproof Minimalist Tech Commuter Backpack 22L',
                'price' => 89.99,
                'cost' => 38.00,
                'stock' => 75,
                'photo' => 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
                'description' => 'Ballistic nylon construction, dedicated suspended laptop cradle, luggage pass-through, and YKK weather-sealed zippers.',
            ],
            [
                'sku' => 'PROD-GAMINGMOUSE-24',
                'name' => 'Ultra-Lightweight 54g Esports Wireless Gaming Mouse 26K DPI',
                'price' => 79.99,
                'cost' => 35.00,
                'stock' => 80,
                'photo' => 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80',
                'description' => 'Flawless optical sensor, optical switch triggers, 4K wireless polling ready, and pure PTFE skate feet.',
            ],
            [
                'sku' => 'PROD-LIGHTBAR-25',
                'name' => 'RGB Smart Light Bar Pair with Screen Mirroring Video Sync',
                'price' => 54.99,
                'cost' => 22.00,
                'stock' => 90,
                'photo' => 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
                'description' => 'Dual vertical light towers with 16 million colors and game sync for an immersive battlestation aesthetic.',
            ],
            [
                'sku' => 'PROD-MONITOR2K-26',
                'name' => '27-inch 2K QHD 180Hz Fast IPS Esports Gaming Display',
                'price' => 299.99,
                'cost' => 190.00,
                'stock' => 40,
                'photo' => 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80',
                'description' => '1ms response time, AMD FreeSync Premium, G-Sync compatible, HDR400, and factory color-calibrated IPS panel.',
            ],
            [
                'sku' => 'PROD-DJHEADPHONES-27',
                'name' => 'Professional DJ & Studio Monitoring Over-Ear Headphones',
                'price' => 119.99,
                'cost' => 55.00,
                'stock' => 60,
                'photo' => 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80',
                'description' => '90-degree swiveling earcups, copper-clad aluminum wire voice coils, and detachable coiled studio cables.',
            ],
            [
                'sku' => 'PROD-DOORBELL-28',
                'name' => 'Smart 2K HDR Wireless Video Doorbell with Dual Detection',
                'price' => 99.99,
                'cost' => 45.00,
                'stock' => 50,
                'photo' => 'https://images.unsplash.com/photo-1558002038-1055907df827?w=800&auto=format&fit=crop&q=80',
                'description' => 'Head-to-toe 180-degree field of view, two-way audio, local encrypted storage, and 6-month battery charge.',
            ],
            [
                'sku' => 'PROD-CABLE-29',
                'name' => 'Braided 240W USB-C to USB-C Fast Charging Cable 2m',
                'price' => 19.99,
                'cost' => 6.00,
                'stock' => 200,
                'photo' => 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
                'description' => 'E-Marker chip supporting up to 48V/5A power delivery for laptops, phones, and tablets with 25,000 bend lifespan.',
            ],
            [
                'sku' => 'PROD-LEATHERCASE-30',
                'name' => 'Top Grain Vintage Leather Sleeve for MacBook Pro 14',
                'price' => 54.99,
                'cost' => 24.00,
                'stock' => 70,
                'photo' => 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&auto=format&fit=crop&q=80',
                'description' => 'Develops a rich natural patina over time with microfiber interior protection and subtle magnetic latch.',
            ],
            [
                'sku' => 'PROD-ARM-31',
                'name' => 'Heavy-Duty Gas Spring Single Monitor Arm Mount 34-inch',
                'price' => 59.99,
                'cost' => 25.00,
                'stock' => 65,
                'photo' => 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&auto=format&fit=crop&q=80',
                'description' => 'Full motion articulation with 360-degree rotation, integrated cable routing channels, and C-clamp/grommet mounting.',
            ],
            [
                'sku' => 'PROD-BOOMARM-32',
                'name' => 'Low-Profile Scissor Broadcast Microphone Boom Arm',
                'price' => 64.99,
                'cost' => 28.00,
                'stock' => 75,
                'photo' => 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
                'description' => 'Internal springs with magnetic cable covers that stays below the shoulder line for clean camera framing.',
            ],
            [
                'sku' => 'PROD-HEADSTAND-33',
                'name' => 'Machined Aluminum Headphone Stand with Silicone Cradle',
                'price' => 29.99,
                'cost' => 11.00,
                'stock' => 120,
                'photo' => 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80',
                'description' => 'Weighted solid metal base with contoured silicone headrest prevents headband crease on premium audiophile gear.',
            ],
            [
                'sku' => 'PROD-SPLITKEY-34',
                'name' => 'Ergonomic Split Ortholinear Mechanical Keyboard',
                'price' => 159.99,
                'cost' => 80.00,
                'stock' => 35,
                'photo' => 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
                'description' => 'Independent halves with tenting legs, programmable OLED screens, per-key RGB, and hot-swap Kailh sockets.',
            ],
            [
                'sku' => 'PROD-POWERSTATION-35',
                'name' => 'Portable 256Wh LiFePO4 Power Station 300W AC Outlet',
                'price' => 219.99,
                'cost' => 130.00,
                'stock' => 30,
                'photo' => 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
                'description' => 'Fast 60-minute solar/wall recharge, pure sine wave AC output, USB-C 100W PD, and 3,000+ lifecycle battery cells.',
            ],
            [
                'sku' => 'PROD-CARMOUNT-36',
                'name' => 'Qi2 15W Magnetic Wireless Fast Charging Car Mount',
                'price' => 36.99,
                'cost' => 14.00,
                'stock' => 110,
                'photo' => 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&auto=format&fit=crop&q=80',
                'description' => 'Heavy-duty steel vent hook with ultra-strong N52 neodymium magnets and 360-degree ball joint rotation.',
            ],
            [
                'sku' => 'PROD-AIRMONITOR-37',
                'name' => 'Smart Home Air Quality & Temperature Sensor with E-Ink Display',
                'price' => 49.99,
                'cost' => 20.00,
                'stock' => 85,
                'photo' => 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&auto=format&fit=crop&q=80',
                'description' => 'High precision Swiss Sensirion sensor monitoring PM2.5, CO2, VOCs, humidity, and temperature with Apple HomeKit support.',
            ],
            [
                'sku' => 'PROD-COILEDCABLE-38',
                'name' => 'Custom Aviator Coiled Keyboard Cable USB-C to USB-A',
                'price' => 24.99,
                'cost' => 9.00,
                'stock' => 150,
                'photo' => 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
                'description' => 'Double-sleeved with Paracord and Techflex, featuring 5-pin detachable GX16 aviator connector.',
            ],
            [
                'sku' => 'PROD-DESKLAMP-39',
                'name' => 'Minimalist LED Architecture Task Lamp with Clamp Mount',
                'price' => 59.99,
                'cost' => 24.00,
                'stock' => 80,
                'photo' => 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80',
                'description' => 'Multi-joint aluminum swing arm with 24W ultra-wide illumination, Ra95 color rendering, and touch stepless dimming.',
            ],
            [
                'sku' => 'PROD-FOAM-40',
                'name' => 'High Density Acoustic Studio Isolation Foam Tiles 12-Pack',
                'price' => 34.99,
                'cost' => 13.00,
                'stock' => 90,
                'photo' => 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&auto=format&fit=crop&q=80',
                'description' => '3D pyramid acoustic absorption panels designed to eliminate flutter echoes and standing waves in home studios.',
            ],
            [
                'sku' => 'PROD-SMARTPLUG-41',
                'name' => 'Matter Smart Wi-Fi Mini Plug with Energy Monitoring 4-Pack',
                'price' => 39.99,
                'cost' => 15.00,
                'stock' => 100,
                'photo' => 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=80',
                'description' => 'Works across Apple Home, Google Home, and Alexa simultaneously with schedule automation and power usage telemetry.',
            ],
            [
                'sku' => 'PROD-KEYCAPS-42',
                'name' => 'PBT Dye-Sub Minimalist Japanese Hiragana Keycap Set 140 Keys',
                'price' => 44.99,
                'cost' => 18.00,
                'stock' => 70,
                'photo' => 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
                'description' => 'Thick 1.5mm PBT plastic with Cherry profile, oil-resistant matte texture, and crisp legends that never fade.',
            ],
            [
                'sku' => 'PROD-TRACKPAD-43',
                'name' => 'Rechargeable Wireless Glass Multi-Touch Trackpad with Haptics',
                'price' => 89.99,
                'cost' => 42.00,
                'stock' => 50,
                'photo' => 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80',
                'description' => 'Edge-to-edge frosted glass surface supporting full Windows precision gestures and pressure-sensitive clicks.',
            ],
            [
                'sku' => 'PROD-PEN-44',
                'name' => 'Solid Titanium Precision Stylus & Ballpoint EDC Pen',
                'price' => 34.99,
                'cost' => 14.00,
                'stock' => 120,
                'photo' => 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80',
                'description' => 'CNC machined Grade 5 titanium body with Schmidt pressurized refill that writes upside down and underwater.',
            ],
            [
                'sku' => 'PROD-BOOMBOX-45',
                'name' => 'Portable 100W IPX7 Outdoor Bluetooth Boombox with RGB Lighting',
                'price' => 149.99,
                'cost' => 75.00,
                'stock' => 45,
                'photo' => 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&auto=format&fit=crop&q=80',
                'description' => 'Massive dual subwoofer output, powerbank phone charging, party-link multi-speaker pairing, and 24-hour battery.',
            ],
        ];

        // Seed products into master catalog
        $createdProducts = [];
        foreach ($catalog as $item) {
            $prod = Product::updateOrCreate(
                ['sku' => $item['sku']],
                [
                    'name' => $item['name'],
                    'price' => $item['price'],
                    'cost' => $item['cost'],
                    'stock' => $item['stock'],
                    'photo' => $item['photo'],
                    'description' => $item['description'],
                    'status' => Product::STATUS_ACTIVE,
                    'company_id' => null,
                    'created_by' => $admin->id,
                ]
            );

            $createdProducts[] = $prod;
        }

        // 5. Assign products across the 8 shops
        // Distribute items so each shop gets 6 - 12 active products with shop-specific prices
        $assignments = [
            // Shop 1: TechVerse (Audio, Displays, Gaming)
            1 => [0, 1, 4, 6, 8, 10, 15, 16, 20, 23, 25, 44],
            // Shop 2: Gear & Gadgets (Chargers, wearables, mobile)
            2 => [1, 2, 3, 5, 7, 8, 11, 21, 28, 35],
            // Shop 3: Nordic Living (Minimalist desk setups, sleeves, risers)
            3 => [9, 11, 12, 13, 14, 29, 38, 43],
            // Shop 4: Apex Performance (Keyboards, mice, esports)
            4 => [4, 5, 6, 7, 10, 23, 24, 25, 33, 36, 41],
            // Shop 5: Aura Smart Lighting (Screenbars, RGB, smart sensors)
            5 => [13, 17, 24, 27, 36, 38, 40],
            // Shop 6: Chronos Timepieces (Smartwatches, EDC titanium)
            6 => [1, 8, 21, 28, 43],
            // Shop 7: Studio Pro Audio (Mics, reference monitors, DACs, headphones)
            7 => [0, 7, 15, 19, 20, 26, 31, 32, 39],
            // Shop 8: Urban Carry Co. (Tech sleeves, backpacks, cable organizers)
            8 => [2, 9, 14, 22, 28, 29, 37],
        ];

        foreach ($assignments as $shopIndex => $productIndexes) {
            $shop = $shops[$shopIndex - 1];
            foreach ($productIndexes as $pIndex) {
                if (isset($createdProducts[$pIndex])) {
                    $prod = $createdProducts[$pIndex];
                    // Optional slight discount or price override per store
                    $customPrice = round($prod->price * (0.92 + (($shopIndex % 3) * 0.03)), 2);

                    ShopProduct::updateOrCreate(
                        ['company_id' => $shop->id, 'product_id' => $prod->id],
                        [
                            'price' => $customPrice,
                            'thumbnail' => null,
                            'description' => "Verified in-stock item at {$shop->name}. Includes official merchant warranty and dispatch.",
                            'status' => ShopProduct::STATUS_ACTIVE,
                        ]
                    );
                }
            }
        }
    }
}
