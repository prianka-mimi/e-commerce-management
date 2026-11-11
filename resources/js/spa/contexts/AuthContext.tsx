import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { authService } from '@/services/auth';
import { syncCsrfToken } from '@/services/http';
import type { User } from '@/types';

interface AuthContextValue {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<User>;
    register: (data: {
        name: string;
        email: string;
        password: string;
        phone?: string;
        role?: string;
        shop_name?: string;
    }) => Promise<User>;
    logout: () => Promise<void>;
    updateUser: (nextUser: User) => void;
    isAuthenticated: boolean;
    hasRole: (role: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): User | null {
    try {
        const raw = localStorage.getItem('auth_user');
        return raw ? (JSON.parse(raw) as User) : null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(loadUser);
    const [token, setToken] = useState<string | null>(
        () => localStorage.getItem('auth_token')
    );

    const login = useCallback(async (email: string, password: string): Promise<User> => {
        const { data: res } = await authService.login(email, password);
        if (!res.status) throw new Error(res.status_message);
        const { token: t, user: u, csrf_token: csrfToken } = res.data;
        syncCsrfToken(csrfToken);
        localStorage.setItem('auth_token', t);
        localStorage.setItem('auth_user', JSON.stringify(u));
        setToken(t);
        setUser(u);
        return u;
    }, []);

    const register = useCallback(
        async (data: {
            name: string;
            email: string;
            password: string;
            phone?: string;
            role?: string;
            shop_name?: string;
        }): Promise<User> => {
            const { data: res } = await authService.register(data);
            if (!res.status) throw new Error(res.status_message);
            const { token: t, user: u, csrf_token: csrfToken } = res.data;
            syncCsrfToken(csrfToken);
            localStorage.setItem('auth_token', t);
            localStorage.setItem('auth_user', JSON.stringify(u));
            setToken(t);
            setUser(u);
            return u;
        },
        []
    );

    const logout = useCallback(async () => {
        try {
            const res = await authService.logout();
            syncCsrfToken(res.data?.data?.csrf_token);
        } finally {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            setToken(null);
            setUser(null);
        }
    }, []);

    const updateUser = useCallback((nextUser: User) => {
        localStorage.setItem('auth_user', JSON.stringify(nextUser));
        setUser(nextUser);
    }, []);

    const hasRole = useCallback(
        (role: string | string[]) => {
            if (!user || !Array.isArray(user.role)) return false;
            const roles = Array.isArray(role) ? role : [role];
            return user.role.some((r) => roles.includes(r));
        },
        [user]
    );

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                login,
                register,
                logout,
                updateUser,
                isAuthenticated: !!token,
                hasRole,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
