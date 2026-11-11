import http from './http';
import type { ApiResponse } from '@/types';

export const shopProductService = {
    list: (params?: Record<string, unknown>) =>
        http.get<ApiResponse>('/shop-product', { params }),

    catalog: (params?: Record<string, unknown>) =>
        http.get<ApiResponse>('/shop-product/catalog', { params }),

    store: (data: FormData) =>
        http.post<ApiResponse>('/shop-product', data),

    update: (id: number, data: FormData) => {
        data.append('_method', 'PUT');
        return http.post<ApiResponse>(`/shop-product/${id}`, data);
    },

    destroy: (id: number) =>
        http.delete<ApiResponse>(`/shop-product/${id}`),
};
