import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useToast } from '@/contexts/ToastContext';
import { companyService } from '@/services/company';
import { uploadImageChunked } from '@/services/upload';
import { getApiErrorMessage } from '@/services/http';
import { Spinner, Alert, Badge, Pagination, ConfirmDialog, Modal } from '@/components/ui';
import { SafeImage } from '@/components/SafeImage';
import { ImageUploadField } from '@/components/ImageUploadField';
import { PackageIcon, ExternalLinkIcon } from '@/components/Icons';
import type { Company, PaginatedData } from '@/types';

export default function ShopsPage() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingShop, setEditingShop] = useState<Company | null>(null);
    const [viewingShop, setViewingShop] = useState<Company | null>(null);
    const [deleteShopId, setDeleteShopId] = useState<number | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    // Form inputs
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [website, setWebsite] = useState('');
    const [address, setAddress] = useState('');
    const [status, setStatus] = useState<number>(1);
    const [sortDescription, setSortDescription] = useState('');
    const [description, setDescription] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['admin-shops', page, search],
        queryFn: async () => {
            const res = await companyService.list({ page, name: search || undefined });
            return res.data.data as PaginatedData<Company>;
        },
    });

    const shops = data?.data || [];
    const meta = data?.meta;

    function openCreateModal() {
        setEditingShop(null);
        setName('');
        setEmail('');
        setPhone('');
        setWebsite('');
        setAddress('');
        setStatus(1);
        setSortDescription('');
        setDescription('');
        setLogoFile(null);
        setUploadProgress(null);
        setFormError(null);
        setModalOpen(true);
    }

    function openEditModal(shop: Company) {
        setEditingShop(shop);
        setName(shop.name);
        setEmail(shop.email || '');
        setPhone(shop.phone || '');
        setWebsite(shop.website || '');
        setAddress(shop.address || '');
        setStatus(shop.status);
        setSortDescription(shop.sort_description || '');
        setDescription(shop.description || '');
        setLogoFile(null);
        setUploadProgress(null);
        setFormError(null);
        setModalOpen(true);
    }

    const saveMutation = useMutation({
        mutationFn: async () => {
            let uploadedLogoPath: string | null = null;
            if (logoFile) {
                setUploadProgress(0);
                uploadedLogoPath = await uploadImageChunked(
                    logoFile,
                    'uploads/companies/logos',
                    setUploadProgress
                );
            }

            const fd = new FormData();
            fd.append('name', name);
            fd.append('email', email);
            fd.append('phone', phone);
            fd.append('website', website);
            fd.append('address', address);
            fd.append('status', String(status));
            fd.append('sort_description', sortDescription);
            fd.append('description', description);
            if (uploadedLogoPath) {
                fd.append('logo', uploadedLogoPath);
            }

            if (editingShop) {
                return await companyService.update(editingShop.id, fd);
            } else {
                return await companyService.store(fd);
            }
        },
        onSuccess: () => {
            setUploadProgress(null);
            queryClient.invalidateQueries({ queryKey: ['admin-shops'] });
            queryClient.invalidateQueries({ queryKey: ['admin-overview-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['admin-companies-select'] });
            queryClient.invalidateQueries({ queryKey: ['customer-shops-slider'] });
            queryClient.invalidateQueries({ queryKey: ['customer-shops-filter-list'] });
            showToast(editingShop ? 'Shop updated successfully.' : 'Shop created successfully.', 'success');
            setModalOpen(false);
        },
        onError: (err: unknown) => {
            setUploadProgress(null);
            const msg = getApiErrorMessage(err, 'Failed to save shop.');
            setFormError(msg);
            showToast(msg, 'error');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await companyService.destroy(id);
        },
        onSuccess: () => {
            setActionError(null);
            queryClient.invalidateQueries({ queryKey: ['admin-shops'] });
            queryClient.invalidateQueries({ queryKey: ['admin-overview-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['admin-companies-select'] });
            queryClient.invalidateQueries({ queryKey: ['customer-shops-slider'] });
            queryClient.invalidateQueries({ queryKey: ['customer-shops-filter-list'] });
            showToast('Shop deleted successfully.', 'success');
            setDeleteShopId(null);
        },
        onError: (err: unknown) => {
            const msg = getApiErrorMessage(err, 'Failed to delete shop.');
            setActionError(msg);
            showToast(msg, 'error');
            setDeleteShopId(null);
        },
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setFormError(null);
        saveMutation.mutate();
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Shop Management</h1>
                    <p className="text-sm text-slate-500">
                        Create, inspect, update, and manage company shops. Click any row for details.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-2xs"
                >
                    + Add New Shop
                </button>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex gap-4">
                <input
                    type="text"
                    placeholder="Search shops by name..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    className="max-w-md w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {isLoading && <Spinner />}
            {error && <Alert type="error" message="Failed to load shops." />}
            {actionError && <Alert type="error" message={actionError} />}

            {!isLoading && (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3.5">Shop</th>
                                <th className="px-6 py-3.5">Contact</th>
                                <th className="px-6 py-3.5">Website</th>
                                <th className="px-6 py-3.5">Products Quantity</th>
                                <th className="px-6 py-3.5">Status</th>
                                <th className="px-6 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-700">
                            {shops.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                                        No shops registered yet.
                                    </td>
                                </tr>
                            ) : (
                                shops.map((shop) => (
                                    <tr
                                        key={shop.id}
                                        onClick={() => setViewingShop(shop)}
                                        className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                                        title="Click to view full shop details"
                                    >
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                                                <SafeImage
                                                    src={shop.logo}
                                                    alt={shop.name}
                                                    fallbackType="shop"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                    {shop.name}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    ID: #{shop.id}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            <div>{shop.email}</div>
                                            <div className="text-slate-400">{shop.phone}</div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono text-indigo-600">
                                            {shop.website || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 font-bold text-xs">
                                                <PackageIcon className="w-3.5 h-3.5 text-indigo-600" />
                                                <span>{shop.shop_products_count ?? 0} Products</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge active={shop.status === 1} />
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setViewingShop(shop);
                                                }}
                                                className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white text-xs font-bold transition-colors"
                                            >
                                                View
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditModal(shop);
                                                }}
                                                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteShopId(shop.id);
                                                }}
                                                className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white text-xs font-semibold transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
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

            {/* SINGLE DETAILS VIEW MODAL */}
            <Modal
                isOpen={!!viewingShop}
                onClose={() => setViewingShop(null)}
                title={viewingShop?.name || 'Shop Details'}
                size="3xl"
            >
                {viewingShop && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white p-1 border border-slate-200 shrink-0">
                                <SafeImage
                                    src={viewingShop.logo}
                                    alt={viewingShop.name}
                                    fallbackType="shop"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{viewingShop.name}</h3>
                                <p className="text-xs text-slate-500">Shop ID: #{viewingShop.id}</p>
                                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                                    {viewingShop.status === 1 ? 'Active Shop' : 'Inactive'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-100">
                                <span className="text-indigo-600 font-semibold block uppercase tracking-wider text-[10px]">
                                    Products Quantity
                                </span>
                                <span className="text-xl font-black text-indigo-700 mt-1 block">
                                    {viewingShop.shop_products_count ?? 0} Products
                                </span>
                                <span className="text-slate-500">Currently assigned to shop</span>
                            </div>

                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                                    Storefront Link
                                </span>
                                <Link
                                    to={`/shops/${viewingShop.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                >
                                    <span>Open Customer View</span>
                                    <ExternalLinkIcon className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>

                        <div className="space-y-2 text-xs text-slate-600 bg-white p-4 rounded-xl border border-slate-200">
                            <div className="flex justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-400">Email:</span>
                                <span className="font-medium text-slate-800">{viewingShop.email || '-'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-400">Phone:</span>
                                <span className="font-medium text-slate-800">{viewingShop.phone || '-'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-400">Website:</span>
                                <span className="font-mono text-indigo-600">{viewingShop.website || '-'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-400">Address:</span>
                                <span className="font-medium text-slate-800">{viewingShop.address || '-'}</span>
                            </div>
                            {viewingShop.sort_description && (
                                <div className="py-2 border-b border-slate-100">
                                    <span className="text-slate-400 block mb-1">Tagline:</span>
                                    <span className="font-medium text-slate-700">{viewingShop.sort_description}</span>
                                </div>
                            )}
                            {viewingShop.description && (
                                <div className="py-2">
                                    <span className="text-slate-400 block mb-1">Detailed Description:</span>
                                    <span className="text-slate-600 leading-relaxed">{viewingShop.description}</span>
                                </div>
                            )}
                        </div>

                        <div className="pt-2 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    const target = viewingShop;
                                    setViewingShop(null);
                                    openEditModal(target);
                                }}
                                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-indigo-600 transition-colors"
                            >
                                Edit Shop
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewingShop(null)}
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
                title={editingShop ? 'Edit Shop' : 'Add New Shop'}
                size="3xl"
            >
                {formError && (
                    <div className="mb-4">
                        <Alert type="error" message={formError} />
                    </div>
                )}

                        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Shop Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Phone
                                    </label>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Website
                                    </label>
                                    <input
                                        type="text"
                                        value={website}
                                        onChange={(e) => setWebsite(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                                    />
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
                                    Address
                                </label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Short Description (Tagline)
                                </label>
                                <input
                                    type="text"
                                    value={sortDescription}
                                    onChange={(e) => setSortDescription(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Full Description
                                </label>
                                <textarea
                                    rows={3}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <ImageUploadField
                                label="Shop Logo (Optional)"
                                file={logoFile}
                                onChange={setLogoFile}
                                currentImageUrl={editingShop?.logo}
                                fallbackType="shop"
                                progress={uploadProgress}
                            />

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
                                    {saveMutation.isPending ? 'Saving...' : 'Save Shop'}
                                </button>
                            </div>
                        </form>
            </Modal>

            <ConfirmDialog
                isOpen={deleteShopId !== null}
                title="Delete Shop"
                message="Are you sure you want to delete this shop? All shop-specific product associations will be removed."
                confirmText="Delete"
                loading={deleteMutation.isPending}
                onConfirm={() => deleteShopId && deleteMutation.mutate(deleteShopId)}
                onCancel={() => setDeleteShopId(null)}
            />
        </div>
    );
}
