import http from './http';
import type { ApiResponse, Company } from '@/types';

export const companyService = {
    list: (params?: Record<string, unknown>) =>
        http.get<ApiResponse>('/company', { params }),

    show: (id: number) =>
        http.get<ApiResponse<Company>>(`/company/${id}`),

    store: (data: FormData) =>
        http.post<ApiResponse<Company>>('/company', data),

    update: (id: number, data: FormData) => {
        data.append('_method', 'PUT');
        return http.post<ApiResponse<Company>>(`/company/${id}`, data);
    },

    destroy: (id: number) =>
        http.delete<ApiResponse>(`/company/${id}`),
};
