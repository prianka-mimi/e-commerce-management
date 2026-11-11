import http from './http';
import type { ApiResponse } from '@/types';

export const productService = {
    list: (params?: Record<string, unknown>) =>
        http.get<ApiResponse>('/product', { params }),

    store: (data: FormData) =>
        http.post<ApiResponse>('/product', data),

    update: (id: number, data: FormData) => {
        data.append('_method', 'PUT');
        return http.post<ApiResponse>(`/product/${id}`, data);
    },

    destroy: (id: number) =>
        http.delete<ApiResponse>(`/product/${id}`),
};
