import { Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute({ roles }: { roles?: string[] }) {
    const { isAuthenticated, hasRole } = useAuth();

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    if (roles && !hasRole(roles)) return <Navigate to="/" replace />;

    return <Outlet />;
}

export function GuestRoute() {
    const { isAuthenticated, hasRole } = useAuth();
    const [searchParams] = useSearchParams();

    if (!isAuthenticated) return <Outlet />;

    if (searchParams.get('redirect') === 'checkout') {
        return <Navigate to="/?checkout=1" replace />;
    }

    if (hasRole('Admin')) {
        return <Navigate to="/admin/dashboard" replace />;
    }
    if (hasRole('Owner')) {
        return <Navigate to="/owner/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
}
