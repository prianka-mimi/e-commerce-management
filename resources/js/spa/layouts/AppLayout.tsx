import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/services/http';
import { SafeImage } from '@/components/SafeImage';
import { AccountSettingsModal } from '@/components/AccountSettingsModal';
import { ArrowRightIcon, ExternalLinkIcon } from '@/components/Icons';

const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard Overview' },
    { to: '/admin/shops', label: 'Shops Management' },
    { to: '/admin/products', label: 'Global Catalog' },
    { to: '/admin/orders', label: 'Orders' },
    { to: '/admin/users', label: 'Users & Roles' },
];

const ownerLinks = [
    { to: '/owner/dashboard', label: 'Dashboard Overview' },
    { to: '/owner/my-products', label: 'My Shop Products' },
    { to: '/owner/catalog', label: 'Shared Catalog' },
    { to: '/owner/create-product', label: 'Add New Product' },
    { to: '/owner/orders', label: 'Orders' },
];

export default function AppLayout() {
    const { user, logout, hasRole } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

    const links = hasRole('Admin') ? adminLinks : ownerLinks;
    const isAdmin = hasRole('Admin');

    async function handleLogout() {
        try {
            await logout();
            showToast('Signed out successfully.', 'info');
            navigate('/login');
        } catch (err: unknown) {
            showToast(getApiErrorMessage(err, 'Failed to sign out.'), 'error');
        }
    }

    return (
        <div className="h-screen flex bg-slate-50 overflow-hidden">
            <aside className="w-64 h-full bg-slate-900 text-white flex flex-col shrink-0 overflow-y-auto shadow-xl">
                <div className="px-6 py-6 border-b border-slate-800">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                            S
                        </div>
                        <span className="text-lg font-black tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                            Shop<span className="text-indigo-400">Market</span>
                        </span>
                    </Link>
                    <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
                                <SafeImage
                                    src={user?.photo}
                                    alt={user?.name || 'User'}
                                    fallbackType="user"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                                <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300">
                                    {isAdmin ? 'Platform Admin' : 'Shop Owner'}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsAccountModalOpen(true)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors shrink-0"
                            title="Profile & Change Password"
                        >
                            Edit
                        </button>
                    </div>
                </div>

                <nav className="flex-1 px-3 py-6 space-y-1.5">
                    {links.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) =>
                                `flex items-center px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                    isActive
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                        : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                                }`
                            }
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="px-3 py-4 border-t border-slate-800 space-y-1.5">
                    <Link
                        to="/"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors"
                    >
                        <span>View Marketplace Storefront</span>
                        <ExternalLinkIcon className="w-3.5 h-3.5" />
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-lg transition-colors"
                    >
                        <span>Sign out</span>
                        <ArrowRightIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            </aside>
            <main className="flex-1 h-full overflow-y-auto">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <Outlet />
                </div>
            </main>
            <AccountSettingsModal
                isOpen={isAccountModalOpen}
                onClose={() => setIsAccountModalOpen(false)}
            />
        </div>
    );
}
