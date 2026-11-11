<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Http\Requests\SendEmailChangeOtpRequest;
use App\Http\Requests\VerifyEmailChangeRequest;
use App\Http\Requests\VerifyForgotOtpRequest;
use App\Http\Resources\UserDetailsResource;
use App\Services\AuthService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Throwable;

class AuthController extends Controller
{
    public function __construct(
        protected AuthService $authService
    ) {}

    public function csrf(): JsonResponse
    {
        return ApiResponse::success([
            'csrf_token' => csrf_token(),
        ], 'CSRF token issued');
    }

    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $result = $this->authService->login(
                $request->input('email'),
                $request->input('password')
            );

            if ($request->hasSession()) {
                Auth::guard('web')->login($result['user']);
                $request->session()->regenerate();
            }

            return ApiResponse::success([
                'token' => $result['token'],
                'user' => new UserDetailsResource($result['user']),
                'csrf_token' => csrf_token(),
            ], 'Login successful');
        } catch (ValidationException $e) {
            return ApiResponse::error($e->getMessage(), 422, $e->errors());
        } catch (Throwable $e) {
            app_error_log('AUTH_LOGIN_FAILED', $e);

            return ApiResponse::error('An unexpected error occurred during login. Please try again.', 500);
        }
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        try {
            $data = $request->validated();

            if (isset($data['role'])) {
                $requested = strtolower($data['role']);
                $data['role'] = in_array($requested, ['seller', 'owner']) ? 'Owner' : 'Customer';
            } else {
                $data['role'] = ! empty($data['shop_name']) ? 'Owner' : 'Customer';
            }

            $result = $this->authService->register($data);

            if ($request->hasSession()) {
                Auth::guard('web')->login($result['user']);
                $request->session()->regenerate();
            }

            return ApiResponse::success([
                'token' => $result['token'],
                'user' => new UserDetailsResource($result['user']),
                'csrf_token' => csrf_token(),
            ], 'Registration completed successfully', 201);
        } catch (ValidationException $e) {
            return ApiResponse::error($e->getMessage(), 422, $e->errors());
        } catch (Throwable $e) {
            app_error_log('AUTH_REGISTER_FAILED', $e);

            return ApiResponse::error('Registration could not be completed. Please try again.', 500);
        }
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user) {
            $this->authService->logout($user);
        }

        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return ApiResponse::success([
            'csrf_token' => csrf_token(),
        ], 'Successfully logged out');
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        try {
            $this->authService->changePassword(
                $request->user(),
                $request->input('old_password'),
                $request->input('new_password')
            );

            return ApiResponse::success(null, 'Password updated successfully');
        } catch (ValidationException $e) {
            return ApiResponse::error($e->getMessage(), 422, $e->errors());
        } catch (Throwable $e) {
            app_error_log('PASSWORD_CHANGE_FAILED', $e);

            return ApiResponse::error('Failed to change password.', 500);
        }
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        try {
            $devOtp = $this->authService->sendPasswordResetOtp($request->input('email'));
            $payload = $devOtp !== null ? ['local_otp' => $devOtp] : null;

            return ApiResponse::success(
                $payload,
                'If an account matches that email, a 6-digit verification OTP has been sent.'
            );
        } catch (Throwable $e) {
            app_error_log('FORGOT_PASSWORD_OTP_FAILED', $e);

            return ApiResponse::error('Unable to send password reset OTP.', 500);
        }
    }

    public function verifyForgotOtp(VerifyForgotOtpRequest $request): JsonResponse
    {
        try {
            $resetToken = $this->authService->verifyPasswordResetOtp(
                $request->input('email'),
                $request->input('otp')
            );

            return ApiResponse::success([
                'reset_token' => $resetToken,
            ], 'OTP verified. You may now set your new password.');
        } catch (ValidationException $e) {
            return ApiResponse::error($e->getMessage(), 422, $e->errors());
        } catch (Throwable $e) {
            app_error_log('FORGOT_OTP_VERIFY_FAILED', $e);

            return ApiResponse::error('Failed to verify OTP.', 500);
        }
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        try {
            $this->authService->resetPasswordWithToken(
                $request->input('email'),
                $request->input('reset_token'),
                $request->input('password')
            );

            return ApiResponse::success(null, 'Password reset successful. Please sign in with your new password.');
        } catch (ValidationException $e) {
            return ApiResponse::error($e->getMessage(), 422, $e->errors());
        } catch (Throwable $e) {
            app_error_log('RESET_PASSWORD_FAILED', $e);

            return ApiResponse::error('Failed to reset password.', 500);
        }
    }

    public function sendEmailChangeOtp(SendEmailChangeOtpRequest $request): JsonResponse
    {
        try {
            $devOtp = $this->authService->sendEmailChangeOtp(
                $request->user(),
                $request->input('current_email')
            );
            $payload = $devOtp !== null ? ['local_otp' => $devOtp] : null;

            return ApiResponse::success(
                $payload,
                'A 6-digit OTP has been sent to your current email address.'
            );
        } catch (ValidationException $e) {
            return ApiResponse::error($e->getMessage(), 422, $e->errors());
        } catch (Throwable $e) {
            app_error_log('EMAIL_CHANGE_OTP_FAILED', $e);

            return ApiResponse::error('Unable to send email verification OTP.', 500);
        }
    }

    public function verifyEmailChange(VerifyEmailChangeRequest $request): JsonResponse
    {
        try {
            $updatedUser = $this->authService->verifyAndChangeEmail(
                $request->user(),
                $request->input('otp'),
                $request->input('new_email')
            );

            return ApiResponse::success(
                new UserDetailsResource($updatedUser),
                'Email address updated successfully.'
            );
        } catch (ValidationException $e) {
            return ApiResponse::error($e->getMessage(), 422, $e->errors());
        } catch (Throwable $e) {
            app_error_log('EMAIL_CHANGE_VERIFY_FAILED', $e);

            return ApiResponse::error('Failed to verify OTP and update email.', 500);
        }
    }
}
