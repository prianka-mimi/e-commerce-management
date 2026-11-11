import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import { userService } from '@/services/user';
import { companyService } from '@/services/company';
import { getApiErrorMessage } from '@/services/http';
import { Spinner, Alert, Badge, Pagination, ConfirmDialog, Modal } from '@/components/ui';
import { EyeIcon, EyeOffIcon, StoreIcon } from '@/components/Icons';
import type { User, Company, PaginatedData } from '@/types';

export default function UsersPage() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [viewingUser, setViewingUser] = useState<User | null>(null);
    const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
    const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
    const [resetNotice, setResetNotice] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    // Form inputs
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [companyId, setCompanyId] = useState<string>('');
    const [role, setRole] = useState<'Customer' | 'Owner' | 'Admin'>('Customer');
    const [status, setStatus] = useState<number>(1);

    const { data, isLoading, error } = useQuery({
        queryKey: ['admin-users', page, search],
        queryFn: async () => {
            const res = await userService.list({ page, name: search || undefined });
            return res.data.data as PaginatedData<User>;
        },
    });

    // Load companies for the shop assignment dropdown
    const { data: companiesData } = useQuery({
        queryKey: ['admin-companies-select'],
        queryFn: async () => {
            const res = await companyService.list({ per_page: 100 });
            return (res.data.data as PaginatedData<Company>).data || [];
        },
    });

    const users = data?.data || [];
    const meta = data?.meta;
    const companies = companiesData || [];

    function getRoleList(userRole: unknown): string[] {
        if (!userRole) return [];
        if (Array.isArray(userRole)) return userRole;
        if (typeof userRole === 'object') return Object.values(userRole as Record<string, string>);
        return [String(userRole)];
    }

    function openCreateModal() {
        setEditingUser(null);
        setName('');
        setEmail('');
        setPhone('');
        setPassword('');
        setShowPassword(false);
        setCompanyId('');
        setRole('Customer');
        setStatus(1);
        setFormError(null);
        setModalOpen(true);
    }

    function openEditModal(u: User) {
        setEditingUser(u);
        setName(u.name);
        setEmail(u.email);
        setPhone(u.phone || '');
        setPassword('');
        setShowPassword(false);
        setCompanyId(u.company_id ? String(u.company_id) : '');

        const userRoles = getRoleList(u.role);
        if (userRoles.includes('Admin')) {
            setRole('Admin');
        } else if (userRoles.includes('Owner')) {
            setRole('Owner');
        } else {
            setRole('Customer');
        }

        setStatus(u.status);
        setFormError(null);
        setModalOpen(true);
    }

    const saveMutation = useMutation({
        mutationFn: async () => {
            const fd = new FormData();
            fd.append('name', name);
            fd.append('email', email);
            fd.append('phone', phone);
            if (!editingUser && password) fd.append('password', password);
            fd.append('company_id', companyId);
            fd.append('role', role);
            fd.append('status', String(status));

            if (editingUser) {
                return await userService.update(editingUser.id, fd);
            } else {
                return await userService.store(fd);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            queryClient.invalidateQueries({ queryKey: ['admin-overview-metrics'] });
            showToast(editingUser ? 'User updated successfully.' : 'User created successfully.', 'success');
            setModalOpen(false);
        },
        onError: (err: unknown) => {
            const msg = getApiErrorMessage(err, 'Failed to save user account.');
            setFormError(msg);
            showToast(msg, 'error');
        },
    });

    const resetPasswordMutation = useMutation({
        mutationFn: async (id: number) => {
            return await userService.resetPassword(id);
        },
        onSuccess: () => {
            setFormError(null);
            setActionError(null);
            setResetPasswordUser(null);
            const msg = 'Password has been reset to 12345678.';
            setResetNotice(msg);
            showToast(msg, 'success');
            setTimeout(() => setResetNotice(null), 5000);
        },
        onError: (err: unknown) => {
            const msg = getApiErrorMessage(err, 'Failed to reset user password.');
            setFormError(msg);
            setActionError(msg);
            showToast(msg, 'error');
            setResetPasswordUser(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await userService.destroy(id);
        },
        onSuccess: () => {
            setActionError(null);
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            queryClient.invalidateQueries({ queryKey: ['admin-overview-metrics'] });
            showToast('User deleted successfully.', 'success');
            setDeleteUserId(null);
        },
        onError: (err: unknown) => {
            const msg = getApiErrorMessage(err, 'Failed to delete user account.');
            setActionError(msg);
            showToast(msg, 'error');
            setDeleteUserId(null);
        },
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setFormError(null);
        saveMutation.mutate();
    }

    function renderRoleBadge(roleList: unknown) {
        const roles = getRoleList(roleList);
        if (roles.includes('Admin')) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Admin
                </span>
            );
        }
        if (roles.includes('Owner')) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    Shop Owner
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Customer
            </span>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Users & Roles</h1>
                    <p className="text-sm text-slate-500">
                        Manage user accounts, assign roles (Customer, Shop Owner, Admin), and configure shop associations. Click any row for details.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-2xs"
                >
                    + Provision New User
                </button>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex gap-4">
                <input
                    type="text"
                    placeholder="Search users by name..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    className="max-w-md w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {resetNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between">
                    <span>{resetNotice}</span>
                    <button
                        type="button"
                        onClick={() => setResetNotice(null)}
                        className="text-emerald-600 hover:text-emerald-900 font-bold"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {isLoading && <Spinner />}
            {error && <Alert type="error" message="Failed to load users." />}
            {actionError && <Alert type="error" message={actionError} />}

            {!isLoading && (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3.5">User</th>
                                <th className="px-6 py-3.5">Phone</th>
                                <th className="px-6 py-3.5">Assigned Shop</th>
                                <th className="px-6 py-3.5">Role</th>
                                <th className="px-6 py-3.5">Status</th>
                                <th className="px-6 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-700">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                users.map((u) => {
                                    const shop = companies.find((c) => c.id === u.company_id);
                                    return (
                                        <tr
                                            key={u.id}
                                            onClick={() => setViewingUser(u)}
                                            className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                                            title="Click to view user details"
                                        >
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                                                    {u.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                        {u.name}
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {u.email}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-600">
                                                {u.phone || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-slate-800">
                                                {shop ? (
                                                    <span className="inline-flex items-center gap-1.5 font-bold text-indigo-600">
                                                        <StoreIcon className="w-3.5 h-3.5 text-indigo-600" />
                                                        <span>{shop.name}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">None</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {renderRoleBadge(u.role)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge active={u.status === 1} />
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setViewingUser(u);
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white text-xs font-bold transition-colors"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditModal(u);
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setResetPasswordUser(u);
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white text-xs font-semibold transition-colors"
                                                    title="Reset password to 12345678"
                                                >
                                                    Reset PW
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteUserId(u.id);
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white text-xs font-semibold transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {meta && meta.total > 20 && (
                <Pagination
                    currentPage={meta.current_page}
                    lastPage={meta.last_page}
                    total={meta.total}
                    onPageChange={(p) => setPage(p)}
                />
            )}

            {/* SINGLE USER DETAILS MODAL */}
            <Modal
                isOpen={!!viewingUser}
                onClose={() => setViewingUser(null)}
                title={viewingUser?.name || 'User Account Details'}
                size="3xl"
            >
                {viewingUser && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-xs">
                                {viewingUser.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{viewingUser.name}</h3>
                                <p className="text-xs text-slate-500">{viewingUser.email}</p>
                                <div className="mt-1">
                                    {renderRoleBadge(viewingUser.role)}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 text-xs text-slate-600 bg-white p-4 rounded-xl border border-slate-200">
                            <div className="flex justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-400">Assigned Shop:</span>
                                <span className="font-bold text-indigo-600">
                                    {companies.find((c) => c.id === viewingUser.company_id)?.name ||
                                        (viewingUser.company_id ? `Shop #${viewingUser.company_id}` : 'None')}
                                </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-400">Phone:</span>
                                <span className="font-medium text-slate-800">{viewingUser.phone || '-'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-400">Account Status:</span>
                                <span className="font-bold text-emerald-600">
                                    {viewingUser.status === 1 ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => {
                                    const target = viewingUser;
                                    setViewingUser(null);
                                    openEditModal(target);
                                }}
                                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-indigo-600 transition-colors"
                            >
                                Edit Account
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewingUser(null)}
                                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Create/Edit Modal with Dark Backdrop & Full Width */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingUser ? 'Edit User & Role' : 'Provision New User'}
                size="3xl"
            >
                {formError && (
                    <div className="mb-4">
                        <Alert type="error" message={formError} />
                    </div>
                )}

                {resetNotice && editingUser && (
                    <div className="mb-4">
                        <Alert type="success" message={resetNotice} />
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Full Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Email Address *
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Phone Number
                            </label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        {!editingUser ? (
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Password *
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Minimum 8 characters"
                                        className="w-full pl-3 pr-10 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOffIcon className="w-4 h-4" />
                                        ) : (
                                            <EyeIcon className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Password Security
                                </label>
                                <div className="flex items-center justify-between gap-2 px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50">
                                    <span className="text-[11px] text-slate-500">
                                        Reset sets password to 12345678
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => resetPasswordMutation.mutate(editingUser.id)}
                                        disabled={resetPasswordMutation.isPending}
                                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors"
                                    >
                                        {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                System Role *
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as 'Customer' | 'Owner' | 'Admin')}
                                className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
                            >
                                <option value="Customer">Customer (Buyer storefront)</option>
                                <option value="Owner">Shop Owner (Merchant portal)</option>
                                <option value="Admin">Admin (Full administrative control)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Status
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(Number(e.target.value))}
                                className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value={1}>Active</option>
                                <option value={2}>Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Assigned Shop {role !== 'Owner' && '(Optional)'}
                        </label>
                        <select
                            value={companyId}
                            onChange={(e) => setCompanyId(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">-- No Shop Assigned (Global / Customer) --</option>
                            {companies.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} (ID: #{c.id})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-5 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saveMutation.isPending}
                            className="px-6 py-2.5 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 shadow-md shadow-indigo-600/25 transition-all"
                        >
                            {saveMutation.isPending ? 'Saving...' : 'Save User'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={deleteUserId !== null}
                title="Delete User Account"
                message="Are you sure you want to delete this user account?"
                confirmText="Delete"
                loading={deleteMutation.isPending}
                onConfirm={() => deleteUserId && deleteMutation.mutate(deleteUserId)}
                onCancel={() => setDeleteUserId(null)}
            />

            <ConfirmDialog
                isOpen={resetPasswordUser !== null}
                title="Reset User Password"
                message={`Reset password for ${resetPasswordUser?.name || 'this user'} to the default password (12345678)?`}
                confirmText="Reset to 12345678"
                onConfirm={() => resetPasswordUser && resetPasswordMutation.mutate(resetPasswordUser.id)}
                onCancel={() => setResetPasswordUser(null)}
                loading={resetPasswordMutation.isPending}
            />
        </div>
    );
}
