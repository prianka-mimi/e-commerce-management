import http from './http';
import type { ApiResponse } from '@/types';

export const orderService = {
    list: (params?: Record<string, unknown>) =>
        http.get<ApiResponse>('/order', { params }),

    updateStatus: (id: number, status: number) =>
        http.put<ApiResponse>(`/order/${id}`, { status }),
};
