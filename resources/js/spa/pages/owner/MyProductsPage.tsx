import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useToast } from '@/contexts/ToastContext';
import { shopProductService } from '@/services/shopProduct';
import { uploadImageChunked } from '@/services/upload';
import { getApiErrorMessage } from '@/services/http';
import { Spinner, Alert, Badge, Pagination, ConfirmDialog, Modal } from '@/components/ui';
import { SafeImage } from '@/components/SafeImage';
import { ImageUploadField } from '@/components/ImageUploadField';
import type { ShopProduct, PaginatedData } from '@/types';

export default function MyProductsPage() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [page, setPage] = useState(1);
    const [nameFilter, setNameFilter] = useState('');

    // Modal state for editing shop-specific overrides
    const [editItem, setEditItem] = useState<ShopProduct | null>(null);
    const [viewingItem, setViewingItem] = useState<ShopProduct | null>(null);
    const [customName, setCustomName] = useState<string>('');
    const [customPrice, setCustomPrice] = useState<string>('');
    const [customDescription, setCustomDescription] = useState<string>('');
    const [status, setStatus] = useState<number>(1);
    const [customThumbnail, setCustomThumbnail] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    // Delete confirmation
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['owner-shop-products', page, nameFilter],
        queryFn: async () => {
            const res = await shopProductService.list({
                page,
                name: nameFilter || undefined,
            });
            return res.data.data as PaginatedData<ShopProduct>;
        },
    });

    const items = data?.data || [];
    const meta = data?.meta;

    function openEditModal(sp: ShopProduct) {
        setEditItem(sp);
        setCustomName(sp.shop_name_override || sp.name || '');
        setCustomPrice(sp.shop_price !== null && sp.shop_price !== undefined ? String(sp.shop_price) : '');
        setCustomDescription(sp.shop_description || '');
        setStatus(sp.status);
        setCustomThumbnail(null);
        setUploadProgress(null);
        setFormError(null);
    }

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editItem) return;

            let uploadedThumbnailPath: string | null = null;
            if (customThumbnail) {
                setUploadProgress(0);
                uploadedThumbnailPath = await uploadImageChunked(
                    customThumbnail,
                    'uploads/shop_products',
                    setUploadProgress
                );
            }

            const fd = new FormData();
            const trimmedName = customName.trim();
            const baseName = (editItem.base_name || '').trim();
            fd.append('name', trimmedName && trimmedName !== baseName ? trimmedName : '');
            fd.append('price', customPrice);
            fd.append('description', customDescription);
            fd.append('status', String(status));
            if (uploadedThumbnailPath) {
                fd.append('thumbnail', uploadedThumbnailPath);
            }

            return await shopProductService.update(editItem.id, fd);
        },
        onSuccess: () => {
            setUploadProgress(null);
            queryClient.invalidateQueries({ queryKey: ['owner-shop-products'] });
            queryClient.invalidateQueries({ queryKey: ['owner-dashboard-products'] });
            queryClient.invalidateQueries({ queryKey: ['owner-catalog'] });
            queryClient.invalidateQueries({ queryKey: ['customer-shop-products'] });
            queryClient.invalidateQueries({ queryKey: ['customer-shop-product-detail'] });
            queryClient.invalidateQueries({ queryKey: ['customer-featured-products-home'] });
            queryClient.invalidateQueries({ queryKey: ['customer-all-products'] });
            showToast('Shop product updated successfully.', 'success');
            setEditItem(null);
        },
        onError: (err: unknown) => {
            setUploadProgress(null);
            const msg = getApiErrorMessage(err, 'Failed to update shop product overrides.');
            setFormError(msg);
            showToast(msg, 'error');
        },
    });

    const removeMutation = useMutation({
        mutationFn: async (id: number) => {
            await shopProductService.destroy(id);
        },
        onSuccess: () => {
            setActionError(null);
            queryClient.invalidateQueries({ queryKey: ['owner-shop-products'] });
            queryClient.invalidateQueries({ queryKey: ['owner-dashboard-products'] });
            queryClient.invalidateQueries({ queryKey: ['owner-catalog'] });
            showToast('Product removed from your shop.', 'success');
            setDeleteId(null);
        },
        onError: (err: unknown) => {
            const msg = getApiErrorMessage(err, 'Failed to remove product from your shop.');
            setActionError(msg);
            showToast(msg, 'error');
            setDeleteId(null);
        },
    });

    function handleSaveOverride(e: FormEvent) {
        e.preventDefault();
        setFormError(null);
        updateMutation.mutate();
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        My Shop Inventory
                    </h1>
                    <p className="text-sm text-slate-500">
                        Products active in your storefront. You can set custom prices, thumbnails, and warranty descriptions. Click any row for details.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/owner/catalog"
                        className="inline-flex items-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-2xs"
                    >
                        + Add From Shared Catalog
                    </Link>
                    <Link
                        to="/owner/create-product"
                        className="inline-flex items-center px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-colors shadow-2xs"
                    >
                        Create New Product
                    </Link>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex gap-4">
                <input
                    type="text"
                    placeholder="Search your assigned products..."
                    value={nameFilter}
                    onChange={(e) => {
                        setNameFilter(e.target.value);
                        setPage(1);
                    }}
                    className="max-w-md w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {isLoading && <Spinner />}
            {error && (
                <Alert
                    type="error"
                    message="Failed to load your shop products. Ensure your company/shop account is active."
                />
            )}
            {actionError && <Alert type="error" message={actionError} />}

            {!isLoading && (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3.5">Product</th>
                                <th className="px-6 py-3.5">Catalog Base</th>
                                <th className="px-6 py-3.5">Shop Override</th>
                                <th className="px-6 py-3.5">Customer Price</th>
                                <th className="px-6 py-3.5">Status</th>
                                <th className="px-6 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-700">
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        No products listed in your shop yet.{' '}
                                        <Link
                                            to="/owner/catalog"
                                            className="text-indigo-600 underline font-medium"
                                        >
                                            Browse the shared catalog
                                        </Link>{' '}
                                        to add some!
                                    </td>
                                </tr>
                            ) : (
                                items.map((sp) => (
                                    <tr
                                        key={sp.id}
                                        onClick={() => setViewingItem(sp)}
                                        className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                                        title="Click to view shop listing details"
                                    >
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 p-1 border border-slate-200 shrink-0">
                                                <SafeImage
                                                    src={sp.thumbnail}
                                                    alt={sp.name}
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                    {sp.name}
                                                </div>
                                                <div className="text-xs font-mono text-slate-400">
                                                    SKU: {sp.sku}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500">
                                            ${Number(sp.base_price).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium">
                                            {sp.shop_price !== null && sp.shop_price !== undefined ? (
                                                <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                                                    ${Number(sp.shop_price).toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 italic">Default</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-black text-slate-900">
                                            ${Number(sp.effective_price).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge active={sp.status === 1} />
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setViewingItem(sp);
                                                }}
                                                className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white text-xs font-bold transition-colors"
                                            >
                                                View
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditModal(sp);
                                                }}
                                                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteId(sp.id);
                                                }}
                                                className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white text-xs font-semibold transition-colors"
                                            >
                                                Remove
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

            {/* SINGLE LISTING DETAILS VIEW MODAL */}
            <Modal
                isOpen={!!viewingItem}
                onClose={() => setViewingItem(null)}
                title={viewingItem?.name || 'Listing Details'}
                size="3xl"
            >
                {viewingItem && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white p-1 border border-slate-200 shrink-0">
                                <SafeImage
                                    src={viewingItem.thumbnail}
                                    alt={viewingItem.name}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">{viewingItem.name}</h3>
                                <p className="text-xs font-mono text-slate-500">SKU: {viewingItem.sku}</p>
                                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                                    {viewingItem.status === 1 ? 'Active in Your Store' : 'Inactive / Hidden'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Base Catalog
                                </span>
                                <span className="text-base font-black text-slate-600 mt-1 block">
                                    ${Number(viewingItem.base_price).toFixed(2)}
                                </span>
                            </div>
                            <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100">
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                                    Your Custom Price
                                </span>
                                <span className="text-base font-black text-indigo-700 mt-1 block">
                                    {viewingItem.shop_price !== null && viewingItem.shop_price !== undefined
                                        ? `$${Number(viewingItem.shop_price).toFixed(2)}`
                                        : 'Default'}
                                </span>
                            </div>
                            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
                                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                                    Effective Customer
                                </span>
                                <span className="text-base font-black text-emerald-700 mt-1 block">
                                    ${Number(viewingItem.effective_price).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
                            <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                                Shop Description & Custom Warranty Notes:
                            </span>
                            <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                                {viewingItem.shop_description ||
                                    viewingItem.description ||
                                    'Standard catalog specifications apply.'}
                            </p>
                        </div>

                        <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => {
                                    const target = viewingItem;
                                    setViewingItem(null);
                                    openEditModal(target);
                                }}
                                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors shadow-2xs"
                            >
                                Edit Custom Pricing & Thumbnail
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewingItem(null)}
                                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Edit Overrides Modal with Dark Backdrop & Full Width */}
            <Modal
                isOpen={!!editItem}
                onClose={() => setEditItem(null)}
                title={editItem ? `Edit Listing: ${editItem.name}` : 'Edit Shop Listing Overrides'}
                size="3xl"
            >
                {formError && (
                    <div className="mb-4">
                        <Alert type="error" message={formError} />
                    </div>
                )}

                {editItem && (
                    <form onSubmit={handleSaveOverride} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Product Title (Shop Display Name) *
                            </label>
                            <input
                                type="text"
                                required
                                value={customName}
                                onChange={(e) => setCustomName(e.target.value)}
                                placeholder={editItem.base_name || editItem.name}
                                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            {editItem.base_name && editItem.base_name !== customName.trim() && (
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Catalog Base Title: {editItem.base_name}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Base Catalog Price
                            </label>
                            <input
                                type="text"
                                disabled
                                value={`$${Number(editItem.base_price).toFixed(2)}`}
                                className="w-full px-3.5 py-2.5 border bg-slate-100 rounded-xl text-sm text-slate-500 cursor-not-allowed font-semibold"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Your Custom Shop Price ($)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={customPrice}
                                onChange={(e) => setCustomPrice(e.target.value)}
                                placeholder="Leave blank to use catalog base price"
                                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                                Customers purchasing from your shop will pay this exact price.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Shop Specific Description / Warranty
                            </label>
                            <textarea
                                rows={3}
                                value={customDescription}
                                onChange={(e) => setCustomDescription(e.target.value)}
                                placeholder="e.g. Includes 2-year shop warranty and express local dispatch..."
                                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>

                        <ImageUploadField
                            label="Custom Shop Thumbnail"
                            file={customThumbnail}
                            onChange={setCustomThumbnail}
                            currentImageUrl={editItem.thumbnail}
                            progress={uploadProgress}
                        />

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Listing Status in Your Shop
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(Number(e.target.value))}
                                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                            >
                                <option value={1}>Active (Visible to customers)</option>
                                <option value={2}>Inactive (Hidden from customers)</option>
                            </select>
                        </div>

                        <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setEditItem(null)}
                                className="px-5 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="px-6 py-2.5 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 shadow-md shadow-indigo-600/25 transition-all"
                            >
                                {updateMutation.isPending ? 'Saving...' : 'Save Overrides'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            <ConfirmDialog
                isOpen={deleteId !== null}
                title="Remove from Your Shop"
                message="Are you sure you want to remove this product from your shop? It will remain in the shared global catalog and you can add it again anytime."
                confirmText="Remove"
                loading={removeMutation.isPending}
                onConfirm={() => deleteId && removeMutation.mutate(deleteId)}
                onCancel={() => setDeleteId(null)}
            />
        </div>
    );
}
