<?php

namespace App\Services;

use App\Models\Company;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;
use Throwable;

class AuthService
{
    private const OTP_TTL_MINUTES = 15;

    /**
     * Authenticate user and issue Sanctum bearer token.
     *
     * @return array{user: User, token: string}
     *
     * @throws ValidationException
     */
    public function login(string $email, string $password): array
    {
        $user = User::where('email', strtolower(trim($email)))->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        if ($user->status !== User::STATUS_ACTIVE) {
            throw ValidationException::withMessages([
                'email' => ['Your account is currently inactive or suspended. Please contact support.'],
            ]);
        }

        $user->tokens()->delete();
        $token = $user->createToken('auth_token')->plainTextToken;

        return [
            'user' => $user->load(['roles', 'company']),
            'token' => $token,
        ];
    }

    /**
     * Register a new user account (Shop Owner or Customer).
     *
     * @return array{user: User, token: string}
     *
     * @throws Throwable
     */
    public function register(array $data): array
    {
        try {
            DB::beginTransaction();

            $user = User::create([
                'name' => trim($data['name']),
                'email' => strtolower(trim($data['email'])),
                'password' => Hash::make($data['password']),
                'phone' => isset($data['phone']) ? trim($data['phone']) : null,
                'status' => User::STATUS_ACTIVE,
            ]);

            $roleName = $data['role'] ?? 'Owner';
            if (Role::where('name', $roleName)->exists()) {
                $user->assignRole($roleName);
            }

            if ($roleName === 'Owner' && ! empty($data['shop_name'])) {
                $company = Company::create([
                    'user_id' => $user->id,
                    'name' => trim($data['shop_name']),
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'status' => Company::STATUS_ACTIVE,
                ]);

                $user->update(['company_id' => $company->id]);
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            DB::commit();

            return [
                'user' => $user->fresh(['roles', 'company']),
                'token' => $token,
            ];
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('User registration failed', ['exception' => $e->getMessage()]);
            throw $e;
        }
    }

    public function logout(User $user): bool
    {
        $token = $user->currentAccessToken();
        if ($token && method_exists($token, 'delete')) {
            return (bool) $token->delete();
        }

        return (bool) $user->tokens()->delete();
    }

    public function changePassword(User $user, string $oldPassword, string $newPassword): void
    {
        if (! Hash::check($oldPassword, $user->password)) {
            throw ValidationException::withMessages([
                'old_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->update([
            'password' => Hash::make($newPassword),
        ]);
    }

    /**
     * Generate a 6-digit password reset OTP and send it to the user's email.
     */
    public function sendPasswordResetOtp(string $email): ?string
    {
        $normalized = strtolower(trim($email));
        $user = User::where('email', $normalized)->first();
        if (! $user) {
            return null;
        }

        $otp = $this->generateOtp();

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $normalized],
            [
                'token' => Hash::make($otp),
                'created_at' => now(),
            ]
        );

        $this->deliverOtpEmail(
            $user->email,
            'Password Reset OTP',
            "Hello {$user->name},\n\nYour 6-digit password reset OTP is: {$otp}\nThis code will expire in ".self::OTP_TTL_MINUTES.' minutes.'
        );

        return $this->exposeDevOtp($otp);
    }

    /**
     * Verify a forgot-password OTP and return a one-time proof token for resetting the password.
     *
     * @throws ValidationException
     */
    public function verifyPasswordResetOtp(string $email, string $otp): string
    {
        $normalized = strtolower(trim($email));
        $record = DB::table('password_reset_tokens')->where('email', $normalized)->first();

        if (! $record || ! $this->isOtpTimestampValid($record->created_at)) {
            throw ValidationException::withMessages([
                'otp' => ['The OTP is invalid or has expired.'],
            ]);
        }

        if (str_starts_with((string) $record->token, 'verified:') || ! Hash::check($otp, (string) $record->token)) {
            throw ValidationException::withMessages([
                'otp' => ['The OTP is invalid or has expired.'],
            ]);
        }

        $resetToken = Str::random(64);
        DB::table('password_reset_tokens')
            ->where('email', $normalized)
            ->update([
                'token' => 'verified:'.Hash::make($resetToken),
                'created_at' => now(),
            ]);

        return $resetToken;
    }

    /**
     * Complete password reset using a verified reset token.
     *
     * @throws ValidationException
     */
    public function resetPasswordWithToken(string $email, string $resetToken, string $newPassword): void
    {
        $normalized = strtolower(trim($email));
        $record = DB::table('password_reset_tokens')->where('email', $normalized)->first();

        if (
            ! $record
            || ! $this->isOtpTimestampValid($record->created_at)
            || ! str_starts_with((string) $record->token, 'verified:')
            || ! Hash::check($resetToken, substr((string) $record->token, 9))
        ) {
            throw ValidationException::withMessages([
                'reset_token' => ['Password reset verification has expired. Please request a new OTP.'],
            ]);
        }

        $user = User::where('email', $normalized)->first();
        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['Account not found for the provided email address.'],
            ]);
        }

        $user->forceFill([
            'password' => Hash::make($newPassword),
        ])->save();

        $user->tokens()->delete();
        DB::table('password_reset_tokens')->where('email', $normalized)->delete();
    }

    /**
     * Verify that the user entered their current (old) email, then email a 6-digit OTP to it.
     *
     * @throws ValidationException
     */
    public function sendEmailChangeOtp(User $user, string $currentEmail): ?string
    {
        if (strtolower(trim($currentEmail)) !== strtolower($user->email)) {
            throw ValidationException::withMessages([
                'current_email' => ['The entered email does not match your current account email.'],
            ]);
        }

        $otp = $this->generateOtp();
        Cache::put(
            $this->emailChangeCacheKey($user->id),
            ['hash' => Hash::make($otp)],
            now()->addMinutes(self::OTP_TTL_MINUTES)
        );

        $this->deliverOtpEmail(
            $user->email,
            'Email Change Verification OTP',
            "Hello {$user->name},\n\nYour 6-digit OTP to verify changing your account email is: {$otp}\nThis code will expire in ".self::OTP_TTL_MINUTES.' minutes.'
        );

        return $this->exposeDevOtp($otp);
    }

    /**
     * Verify OTP sent to the old email and update the user's account email.
     *
     * @throws ValidationException
     */
    public function verifyAndChangeEmail(User $user, string $otp, string $newEmail): User
    {
        $normalizedNewEmail = strtolower(trim($newEmail));
        if ($normalizedNewEmail === strtolower($user->email)) {
            throw ValidationException::withMessages([
                'new_email' => ['New email must be different from your current email address.'],
            ]);
        }

        $cached = Cache::get($this->emailChangeCacheKey($user->id));
        if (! is_array($cached) || empty($cached['hash']) || ! Hash::check($otp, (string) $cached['hash'])) {
            throw ValidationException::withMessages([
                'otp' => ['The verification OTP is invalid or has expired.'],
            ]);
        }

        $user->update(['email' => $normalizedNewEmail]);
        Cache::forget($this->emailChangeCacheKey($user->id));

        return $user->fresh(['roles', 'company']);
    }

    protected function generateOtp(): string
    {
        return (string) random_int(100000, 999999);
    }

    protected function emailChangeCacheKey(int $userId): string
    {
        return "email_change_otp:{$userId}";
    }

    protected function isOtpTimestampValid(?string $createdAt): bool
    {
        if (! $createdAt) {
            return false;
        }

        return Carbon::parse($createdAt)->addMinutes(self::OTP_TTL_MINUTES)->isFuture();
    }

    protected function deliverOtpEmail(string $recipient, string $subject, string $body): void
    {
        try {
            Mail::raw($body, static function ($message) use ($recipient, $subject): void {
                $message->to($recipient)->subject($subject);
            });
        } catch (Throwable $e) {
            Log::warning('OTP email delivery failed', ['recipient' => $recipient, 'error' => $e->getMessage()]);
        }
    }

    protected function exposeDevOtp(string $otp): ?string
    {
        if (
            app()->environment(['local', 'testing'])
            && config('app.debug')
            && in_array(config('mail.default'), ['log', 'array'], true)
        ) {
            return $otp;
        }

        return null;
    }
}
