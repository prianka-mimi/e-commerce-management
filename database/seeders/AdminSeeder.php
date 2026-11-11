<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $data = [
            'name' => 'Admin',
            'email' => 'admin@admin.com',
            'phone' => '01700000000',
            'password' => Hash::make('12345678'),
            'status' => User::STATUS_ACTIVE,
        ];

        $user = User::query()->where('email', $data['email'])->first();
        if (! $user) {
            $admin = User::query()->create($data);
            $admin->assignRole('Admin');
        }
    }
}
