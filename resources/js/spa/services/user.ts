import http from './http';
import type { ApiResponse } from '@/types';

export const userService = {
    list: (params?: Record<string, unknown>) =>
        http.get<ApiResponse>('/user', { params }),

    store: (data: FormData) =>
        http.post<ApiResponse>('/user', data),

    update: (id: number, data: FormData) => {
        data.append('_method', 'PUT');
        return http.post<ApiResponse>(`/user/${id}`, data);
    },

    destroy: (id: number) =>
        http.delete<ApiResponse>(`/user/${id}`),

    resetPassword: (id: number) =>
        http.post<ApiResponse>(`/user/${id}/reset-password`),
};
