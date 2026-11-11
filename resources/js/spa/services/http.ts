import axios from 'axios';

let cachedCsrfToken: string | null =
    typeof document !== 'undefined'
        ? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || null
        : null;

export function syncCsrfToken(token?: string | null): void {
    if (!token || typeof token !== 'string') return;
    cachedCsrfToken = token;
    if (typeof document !== 'undefined') {
        const meta = document.querySelector('meta[name="csrf-token"]');
        if (meta) {
            meta.setAttribute('content', token);
        }
    }
}

const http = axios.create({
    baseURL: '/ajax',
    timeout: 60000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    },
});

http.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    const csrfToken =
        cachedCsrfToken ||
        (typeof document !== 'undefined'
            ? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
            : null);
    if (csrfToken) {
        config.headers['X-CSRF-TOKEN'] = csrfToken;
    }

    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    return config;
});

http.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalConfig = error.config as (typeof error.config & { _csrfRetried?: boolean }) | undefined;

        if (error.response?.status === 419 && originalConfig && !originalConfig._csrfRetried) {
            originalConfig._csrfRetried = true;
            try {
                const csrfRes = await axios.get<{ data?: { csrf_token?: string } }>('/ajax/csrf', {
                    withCredentials: true,
                    headers: { Accept: 'application/json' },
                });
                const fresh = csrfRes.data?.data?.csrf_token;
                if (fresh) {
                    syncCsrfToken(fresh);
                    return http.request(originalConfig);
                }
            } catch {
                // Ignore refresh failure and surface original error
            }
        }

        if (error.response?.status === 401) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export function getApiErrorMessage(err: unknown, fallback: string): string {
    if (!err || typeof err !== 'object') {
        return fallback;
    }

    const axiosErr = err as {
        response?: {
            data?: {
                errors?: Record<string, string[] | string>;
                status_message?: string;
                message?: string;
            };
        };
    };

    const data = axiosErr.response?.data;
    if (data?.errors && typeof data.errors === 'object') {
        const firstValue = Object.values(data.errors).find(Boolean);
        if (Array.isArray(firstValue) && typeof firstValue[0] === 'string' && firstValue[0].trim() !== '') {
            return firstValue[0];
        }
        if (typeof firstValue === 'string' && firstValue.trim() !== '') {
            return firstValue;
        }
    }

    if (typeof data?.status_message === 'string' && data.status_message.trim() !== '') {
        return data.status_message;
    }

    if (typeof data?.message === 'string' && data.message.trim() !== '') {
        return data.message;
    }

    if (!axiosErr.response && err instanceof Error && err.message) {
        return err.message;
    }

    return fallback;
}

export default http;
