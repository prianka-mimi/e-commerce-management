import http from './http';
import type { ApiResponse } from '@/types';

export interface AdminOverviewData {
    metrics: {
        total_shops: number;
        total_sellers: number;
        total_buyers: number;
        total_products: number;
        total_catalog: number;
    };
    latest_orders: Array<{
        id: number;
        trx_id: string;
        shop_name: string;
        customer_name: string;
        customer_email: string | null;
        customer_phone: string | null;
        total_amount: number;
        items_count: number;
        status: number;
        status_text: string;
        items?: Array<{
            id: number;
            product_id: number;
            product_name: string;
            quantity: number;
            price: number;
            total: number;
        }>;
        created_at: string;
    }>;
}

export const adminService = {
    overview: () => http.get<ApiResponse<AdminOverviewData>>('/admin/overview'),
};
