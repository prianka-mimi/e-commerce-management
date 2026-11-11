import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import { productService } from '@/services/product';
import { uploadImageChunked } from '@/services/upload';
import { getApiErrorMessage } from '@/services/http';
import { Spinner, Alert, Badge, Pagination, ConfirmDialog, Modal } from '@/components/ui';
import { SafeImage } from '@/components/SafeImage';
import { ImageUploadField } from '@/components/ImageUploadField';
import type { Product, PaginatedData } from '@/types';

export default function ProductsPage() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
    const [deleteProductId, setDeleteProductId] = useState<number | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    // Form inputs
    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [price, setPrice] = useState('');
    const [cost, setCost] = useState('');
    const [stock, setStock] = useState('100');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<number>(1);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['admin-products', page, search],
        queryFn: async () => {
            const res = await productService.list({ page, name: search || undefined });
            return res.data.data as PaginatedData<Product>;
        },
    });

    const products = data?.data || [];
    const meta = data?.meta;

    function openCreateModal() {
        setEditingProduct(null);
        setName('');
        setSku(`SKU-${Date.now().toString().slice(-6)}`);
        setPrice('');
        setCost('');
        setStock('100');
        setDescription('');
        setStatus(1);
        setPhotoFile(null);
        setUploadProgress(null);
        setFormError(null);
        setModalOpen(true);
    }

    function openEditModal(prod: Product) {
        setEditingProduct(prod);
        setName(prod.name);
        setSku(prod.sku);
        setPrice(String(prod.price));
        setCost(prod.cost !== null && prod.cost !== undefined ? String(prod.cost) : '');
        setStock(String(prod.stock ?? 0));
        setDescription(prod.description || '');
        setStatus(prod.status);
        setPhotoFile(null);
        setUploadProgress(null);
        setFormError(null);
        setModalOpen(true);
    }

    const saveMutation = useMutation({
        mutationFn: async () => {
            let uploadedPhotoPath: string | null = null;
            if (photoFile) {
                setUploadProgress(0);
                uploadedPhotoPath = await uploadImageChunked(
                    photoFile,
                    'uploads/products',
                    setUploadProgress
                );
            }

            const fd = new FormData();
            fd.append('name', name);
            fd.append('sku', sku);
            fd.append('price', price);
            fd.append('cost', cost);
            fd.append('stock', stock);
            fd.append('status', String(status));
            fd.append('description', description);
            if (uploadedPhotoPath) fd.append('photo', uploadedPhotoPath);

            if (editingProduct) {
                return await productService.update(editingProduct.id, fd);
            } else {
                return await productService.store(fd);
            }
        },
        onSuccess: () => {
            setUploadProgress(null);
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            queryClient.invalidateQueries({ queryKey: ['admin-overview-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['owner-catalog'] });
            queryClient.invalidateQueries({ queryKey: ['owner-shop-products'] });
            queryClient.invalidateQueries({ queryKey: ['customer-featured-products-home'] });
            queryClient.invalidateQueries({ queryKey: ['customer-all-products'] });
            queryClient.invalidateQueries({ queryKey: ['customer-shop-products'] });
            showToast(editingProduct ? 'Product updated successfully.' : 'Product created successfully.', 'success');
            setModalOpen(false);
        },
        onError: (err: unknown) => {
            setUploadProgress(null);
            const msg = getApiErrorMessage(err, 'Failed to save product.');
            setFormError(msg);
            showToast(msg, 'error');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await productService.destroy(id);
        },
        onSuccess: () => {
            setActionError(null);
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            queryClient.invalidateQueries({ queryKey: ['admin-overview-metrics'] });
            showToast('Product deleted successfully.', 'success');
            setDeleteProductId(null);
        },
        onError: (err: unknown) => {
            const msg = getApiErrorMessage(err, 'Failed to delete product.');
            setActionError(msg);
            showToast(msg, 'error');
            setDeleteProductId(null);
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
                    <h1 className="text-2xl font-bold text-slate-900">
                        Global Product Catalog
                    </h1>
                    <p className="text-sm text-slate-500">
                        Master catalog items available for shop owners to browse and assign to their shops. Click any row for details.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-2xs"
                >
                    + Add New Product
                </button>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex gap-4">
                <input
                    type="text"
                    placeholder="Search global catalog by name or SKU..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    className="max-w-md w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {isLoading && <Spinner />}
            {error && <Alert type="error" message="Failed to load products." />}
            {actionError && <Alert type="error" message={actionError} />}

            {!isLoading && (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3.5">Product</th>
                                <th className="px-6 py-3.5">SKU</th>
                                <th className="px-6 py-3.5">Base Catalog Price</th>
                                <th className="px-6 py-3.5">Stock</th>
                                <th className="px-6 py-3.5">Status</th>
                                <th className="px-6 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-700">
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                                        No products in the catalog yet.
                                    </td>
                                </tr>
                            ) : (
                                products.map((prod) => (
                                    <tr
                                        key={prod.id}
                                        onClick={() => setViewingProduct(prod)}
                                        className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                                        title="Click to view product details"
                                    >
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 p-0.5">
                                                <SafeImage
                                                    src={prod.photo}
                                                    alt={prod.name}
                                                    fallbackType="product"
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                    {prod.name}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    ID: #{prod.id}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                            {prod.sku}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900">
                                            ${Number(prod.price).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            <span className="font-semibold text-slate-700">{prod.stock}</span> units
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge active={prod.status === 1} />
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setViewingProduct(prod);
                                                }}
                                                className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white text-xs font-bold transition-colors"
                                            >
                                                View
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditModal(prod);
                                                }}
                                                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteProductId(prod.id);
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

            {/* SINGLE PRODUCT DETAILS MODAL */}
            <Modal
                isOpen={!!viewingProduct}
                onClose={() => setViewingProduct(null)}
                title={viewingProduct?.name || 'Product Details'}
                size="3xl"
            >
                {viewingProduct && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-white p-1 border border-slate-200 shrink-0">
                                <SafeImage
                                    src={viewingProduct.photo}
                                    alt={viewingProduct.name}
                                    fallbackType="product"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{viewingProduct.name}</h3>
                                <p className="text-xs font-mono text-slate-500">SKU: {viewingProduct.sku}</p>
                                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                                    {viewingProduct.status === 1 ? 'Active in Shared Catalog' : 'Inactive'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Base Catalog Price
                                </span>
                                <span className="text-lg font-black text-slate-900 mt-1 block">
                                    ${Number(viewingProduct.price).toFixed(2)}
                                </span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Wholesale Cost
                                </span>
                                <span className="text-lg font-black text-slate-600 mt-1 block">
                                    ${Number(viewingProduct.cost || 0).toFixed(2)}
                                </span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Master Stock
                                </span>
                                <span className="text-lg font-black text-indigo-600 mt-1 block">
                                    {viewingProduct.stock} units
                                </span>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
                            <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                                Product Description
                            </span>
                            <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                                {viewingProduct.description || 'No catalog description provided.'}
                            </p>
                        </div>

                        <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => {
                                    const target = viewingProduct;
                                    setViewingProduct(null);
                                    openEditModal(target);
                                }}
                                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-indigo-600 transition-colors"
                            >
                                Edit Product
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewingProduct(null)}
                                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Create / Edit Modal with High-Contrast Dark Backdrop & Full Width */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingProduct ? 'Edit Catalog Product' : 'Add Catalog Product'}
                size="3xl"
            >
                {formError && (
                    <div className="mb-4">
                        <Alert type="error" message={formError} />
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Product Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                SKU *
                            </label>
                            <input
                                type="text"
                                required
                                value={sku}
                                onChange={(e) => setSku(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Status
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(Number(e.target.value))}
                                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                            >
                                <option value={1}>Active</option>
                                <option value={2}>Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Base Price ($) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Cost ($)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={cost}
                                onChange={(e) => setCost(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Stock Qty *
                            </label>
                            <input
                                type="number"
                                required
                                value={stock}
                                onChange={(e) => setStock(e.target.value)}
                                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Product Description
                        </label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>

                    <ImageUploadField
                        label="Product Image (Optional)"
                        file={photoFile}
                        onChange={setPhotoFile}
                        currentImageUrl={editingProduct?.photo}
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
                            {saveMutation.isPending ? 'Saving...' : 'Save Product'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={deleteProductId !== null}
                title="Delete Product"
                message="Are you sure you want to delete this catalog product? It will also be removed from any shops listing it."
                confirmText="Delete"
                loading={deleteMutation.isPending}
                onConfirm={() => deleteProductId && deleteMutation.mutate(deleteProductId)}
                onCancel={() => setDeleteProductId(null)}
            />
        </div>
    );
}
