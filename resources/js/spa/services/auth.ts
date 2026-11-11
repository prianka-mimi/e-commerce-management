import http from './http';
import type { ApiResponse, User } from '@/types';

export const authService = {
    login: (email: string, password: string) =>
        http.post<ApiResponse<{ token: string; user: User; csrf_token?: string }>>('/login', {
            email,
            password,
        }),

    register: (data: {
        name: string;
        email: string;
        password: string;
        phone?: string;
        role?: string;
        shop_name?: string;
    }) =>
        http.post<ApiResponse<{ token: string; user: User; csrf_token?: string }>>(
            '/register',
            data
        ),

    logout: () =>
        http.post<ApiResponse<{ csrf_token?: string } | null>>('/logout'),

    updateProfile: (data: FormData) =>
        http.post<ApiResponse<User>>('/update-profile', data),

    changePassword: (data: { old_password: string; new_password: string }) =>
        http.post<ApiResponse<null>>('/change-password', data),

    sendEmailChangeOtp: (currentEmail: string) =>
        http.post<ApiResponse<{ local_otp?: string } | null>>('/email-change/send-otp', {
            current_email: currentEmail,
        }),

    verifyEmailChange: (data: { otp: string; new_email: string }) =>
        http.post<ApiResponse<User>>('/email-change/verify', data),

    forgotPassword: (email: string) =>
        http.post<ApiResponse<{ local_otp?: string } | null>>('/forgot-password', { email }),

    verifyForgotOtp: (email: string, otp: string) =>
        http.post<ApiResponse<{ reset_token: string }>>('/verify-forgot-otp', { email, otp }),

    resetPassword: (data: {
        email: string;
        reset_token: string;
        password: string;
        password_confirmation: string;
    }) => http.post<ApiResponse<null>>('/reset-password', data),
};
