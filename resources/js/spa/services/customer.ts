import http from './http';
import type { ApiResponse } from '@/types';

export const customerService = {
    shops: (params?: Record<string, unknown>) =>
        http.get<ApiResponse>('/customer/shops', { params }),

    shop: (companyId: number) =>
        http.get<ApiResponse>(`/customer/shops/${companyId}`),

    shopProducts: (companyId: number, params?: Record<string, unknown>) =>
        http.get<ApiResponse>(`/customer/shops/${companyId}/products`, { params }),

    shopProduct: (companyId: number, shopProductId: number) =>
        http.get<ApiResponse>(`/customer/shops/${companyId}/products/${shopProductId}`),

    featuredProducts: (params?: Record<string, unknown>) =>
        http.get<ApiResponse>('/customer/featured-products', { params }),

    checkout: (data: {
        name: string;
        email: string;
        phone: string;
        address: string;
        note?: string;
        payment_method?: 'cod' | 'card';
        items: Array<{ shop_product_id: number; quantity: number }>;
    }) => http.post<ApiResponse>('/customer/checkout', data),
};
