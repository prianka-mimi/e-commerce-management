import { Routes, Route, Navigate } from 'react-router-dom';
import CustomerLayout from '@/layouts/CustomerLayout';
import AppLayout from '@/layouts/AppLayout';
import { ProtectedRoute, GuestRoute } from '@/components/RouteGuards';
import { ScrollToTop } from '@/components/ScrollToTop';

// Customer pages
import ShopsPage from '@/pages/customer/ShopsPage';
import ShopProductsPage from '@/pages/customer/ShopProductsPage';
import ProductDetailPage from '@/pages/customer/ProductDetailPage';
import AllProductsPage from '@/pages/customer/AllProductsPage';

// Auth pages
import LoginPage from '@/pages/auth/LoginPage';

// Admin pages
import AdminDashboardPage from '@/pages/admin/DashboardPage';
import AdminShopsPage from '@/pages/admin/ShopsPage';
import AdminProductsPage from '@/pages/admin/ProductsPage';
import AdminUsersPage from '@/pages/admin/UsersPage';

// Owner pages
import OwnerDashboardPage from '@/pages/owner/DashboardPage';
import OwnerMyProductsPage from '@/pages/owner/MyProductsPage';
import OwnerCatalogPage from '@/pages/owner/CatalogPage';
import OwnerCreateProductPage from '@/pages/owner/CreateProductPage';
import OrdersPage from '@/pages/OrdersPage';

export default function App() {
    return (
        <>
            <ScrollToTop />
            <Routes>
                {/* Public customer storefront - directly at root / */}
                <Route path="/" element={<CustomerLayout />}>
                    <Route index element={<ShopsPage />} />
                    <Route path="shops" element={<ShopsPage />} />
                    <Route path="products" element={<AllProductsPage />} />
                    <Route path="shops/:shopId" element={<ShopProductsPage />} />
                    <Route path="shops/:shopId/products/:productId" element={<ProductDetailPage />} />
                </Route>

                {/* Guest routes (Login) */}
                <Route element={<GuestRoute />}>
                    <Route path="/login" element={<LoginPage />} />
                </Route>

                {/* Admin portal (Admin) */}
                <Route element={<ProtectedRoute roles={['Admin']} />}>
                    <Route path="/admin" element={<AppLayout />}>
                        <Route index element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="dashboard" element={<AdminDashboardPage />} />
                        <Route path="shops" element={<AdminShopsPage />} />
                        <Route path="products" element={<AdminProductsPage />} />
                        <Route path="orders" element={<OrdersPage />} />
                        <Route path="users" element={<AdminUsersPage />} />
                    </Route>
                </Route>

                {/* Shop Owner portal (Owner) */}
                <Route element={<ProtectedRoute roles={['Owner']} />}>
                    <Route path="/owner" element={<AppLayout />}>
                        <Route index element={<Navigate to="/owner/dashboard" replace />} />
                        <Route path="dashboard" element={<OwnerDashboardPage />} />
                        <Route path="my-products" element={<OwnerMyProductsPage />} />
                        <Route path="catalog" element={<OwnerCatalogPage />} />
                        <Route path="create-product" element={<OwnerCreateProductPage />} />
                        <Route path="orders" element={<OrdersPage />} />
                    </Route>
                </Route>

                {/* Unauthorized redirect to landing page */}
                <Route path="/unauthorized" element={<Navigate to="/" replace />} />

                {/* Legacy /app/* redirects to root equivalents for seamless navigation */}
                <Route path="/app" element={<Navigate to="/" replace />} />
                <Route path="/app/shops" element={<Navigate to="/" replace />} />
                <Route path="/app/login" element={<Navigate to="/login" replace />} />
                <Route path="/app/unauthorized" element={<Navigate to="/" replace />} />
                <Route path="/app/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/app/owner/*" element={<Navigate to="/owner/dashboard" replace />} />

                {/* Catch-all redirect to root */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
}
