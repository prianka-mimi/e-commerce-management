import { useState, useEffect } from 'react';
import { Link, Outlet, useSearchParams } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { CartDrawer } from '@/components/CartDrawer';
import { SafeImage } from '@/components/SafeImage';
import { AccountSettingsModal } from '@/components/AccountSettingsModal';
import { CartIcon, StoreIcon, ArrowRightIcon } from '@/components/Icons';

export default function CustomerLayout() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { totalCount, setIsCartOpen } = useCart();
    const { user, isAuthenticated, hasRole } = useAuth();
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

    useEffect(() => {
        if (searchParams.get('checkout') === '1') {
            setIsCartOpen(true);
            const next = new URLSearchParams(searchParams);
            next.delete('checkout');
            setSearchParams(next, { replace: true });
        }
    }, [searchParams, setIsCartOpen, setSearchParams]);

    const isAdmin = hasRole('Admin');
    const isOwner = hasRole('Owner');
    const isStaff = isAdmin || isOwner;
    const dashboardPath = isAdmin ? '/admin/dashboard' : isOwner ? '/owner/dashboard' : null;
    const dashboardLabel = isAdmin ? 'Admin Dashboard' : 'Owner Dashboard';

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
            {/* Main Header */}
            <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-xl font-black tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                                Shop<span className="text-indigo-600">Market</span>
                            </span>
                            <span className="block text-[10px] font-semibold text-slate-500 tracking-wider uppercase">
                                Multi-Store Network
                            </span>
                        </div>
                    </Link>

                    {/* Nav Actions */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link
                            to="/products"
                            className="px-3.5 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            All Products
                        </Link>

                        <button
                            type="button"
                            onClick={() => setIsCartOpen(true)}
                            className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-semibold text-xs sm:text-sm transition-all shadow-2xs border border-slate-200"
                            title="Open Shopping Cart"
                        >
                            <CartIcon className="w-4 h-4 text-slate-600" />
                            <span className="hidden sm:inline">Cart</span>
                            {totalCount > 0 && (
                                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center shadow-xs">
                                    {totalCount}
                                </span>
                            )}
                        </button>

                        {/* Authentication Actions */}
                        {isAuthenticated ? (
                            isStaff && dashboardPath ? (
                                <Link
                                    to={dashboardPath}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all hover:shadow-indigo-500/25"
                                >
                                    {user?.photo && (
                                        <img
                                            src={user.photo}
                                            alt={user.name}
                                            className="w-5 h-5 rounded-md object-cover border border-white/20 shrink-0"
                                        />
                                    )}
                                    <span>{dashboardLabel}</span>
                                    <ArrowRightIcon className="w-3.5 h-3.5" />
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsAccountModalOpen(true)}
                                    className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/60 text-slate-700 font-semibold text-xs sm:text-sm transition-all shadow-2xs"
                                    title="Account Settings & Sign Out"
                                >
                                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-indigo-100 border border-slate-200 shrink-0">
                                        <SafeImage
                                            src={user?.photo}
                                            alt={user?.name || 'Profile'}
                                            fallbackType="user"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <span className="hidden sm:inline max-w-[110px] truncate">
                                        {user?.name || 'Profile'}
                                    </span>
                                </button>
                            )
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link
                                    to="/login?mode=register&role=seller"
                                    className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs sm:text-sm transition-all shadow-2xs hover:shadow-sm"
                                    title="Open your store on ShopMarket"
                                >
                                    <StoreIcon className="w-3.5 h-3.5 text-purple-600" />
                                    <span>Join as Seller</span>
                                </Link>
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs sm:text-sm shadow-sm transition-all hover:shadow-indigo-500/25 active:scale-95"
                                >
                                    <span>Login</span>
                                    <ArrowRightIcon className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Page Content */}
            <main className="flex-1">
                <Outlet />
            </main>

            {/* Cart Slide-Over Drawer */}
            <CartDrawer />

            {/* Customer Profile, Email OTP, Password & Logout Modal */}
            {isAuthenticated && !isStaff && (
                <AccountSettingsModal
                    isOpen={isAccountModalOpen}
                    onClose={() => setIsAccountModalOpen(false)}
                    showSignOut
                />
            )}

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-400 mt-20 border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
                        <div className="space-y-4 md:col-span-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                    S
                                </div>
                                <span className="text-lg font-bold text-white tracking-tight">
                                    Shop<span className="text-indigo-400">Market</span>
                                </span>
                            </div>
                            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
                                Enterprise-grade multi-tenant e-commerce platform. Empowering administrators and shop owners with a shared product catalog and shop-level customizations.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">
                                Platform
                            </h4>
                            <ul className="space-y-2 text-sm">
                                <li>
                                    <Link to="/" className="hover:text-white transition-colors">
                                        Home Storefront
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/products" className="hover:text-white transition-colors">
                                        All Products
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/login" className="hover:text-white transition-colors">
                                        Partner Sign In
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">
                                Support & Trust
                            </h4>
                            <ul className="space-y-2 text-sm text-slate-400">
                                <li>Verified Merchant Guarantee</li>
                                <li>Secure Direct Checkout</li>
                                <li>Real-time Catalog Synchronization</li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-8 text-center text-xs text-slate-500">
                        &copy; {new Date().getFullYear()} ShopMarket. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
