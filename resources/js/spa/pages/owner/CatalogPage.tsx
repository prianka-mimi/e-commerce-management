import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useToast } from '@/contexts/ToastContext';
import { shopProductService } from '@/services/shopProduct';
import { uploadImageChunked } from '@/services/upload';
import { getApiErrorMessage } from '@/services/http';
import { Spinner, Alert, Pagination, Modal } from '@/components/ui';
import { SafeImage } from '@/components/SafeImage';
import { ImageUploadField } from '@/components/ImageUploadField';
import { ArrowLeftIcon } from '@/components/Icons';
import type { Product, PaginatedData } from '@/types';

export default function CatalogPage() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');

    // Assign modal state
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [overrideName, setOverrideName] = useState('');
    const [overridePrice, setOverridePrice] = useState('');
    const [overrideDescription, setOverrideDescription] = useState('');
    const [overrideThumbnail, setOverrideThumbnail] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['owner-catalog', page, search],
        queryFn: async () => {
            const res = await shopProductService.catalog({
                page,
                name: search || undefined,
            });
            return res.data.data as PaginatedData<Product>;
        },
    });

    const products = data?.data || [];
    const meta = data?.meta;

    function openAssignModal(product: Product) {
        setSelectedProduct(product);
        setOverrideName('');
        setOverridePrice('');
        setOverrideDescription('');
        setOverrideThumbnail(null);
        setUploadProgress(null);
        setFormError(null);
    }

    const assignMutation = useMutation({
        mutationFn: async () => {
            if (!selectedProduct) return;

            let uploadedThumbnailPath: string | null = null;
            if (overrideThumbnail) {
                setUploadProgress(0);
                uploadedThumbnailPath = await uploadImageChunked(
                    overrideThumbnail,
                    'uploads/shop_products',
                    setUploadProgress
                );
            }

            const fd = new FormData();
            fd.append('product_id', String(selectedProduct.id));
            if (overrideName.trim()) {
                fd.append('name', overrideName.trim());
            }
            if (overridePrice) {
                fd.append('price', overridePrice);
            }
            if (overrideDescription) {
                fd.append('description', overrideDescription);
            }
            if (uploadedThumbnailPath) {
                fd.append('thumbnail', uploadedThumbnailPath);
            }

            return await shopProductService.store(fd);
        },
        onSuccess: () => {
            setUploadProgress(null);
            queryClient.invalidateQueries({ queryKey: ['owner-catalog'] });
            queryClient.invalidateQueries({ queryKey: ['owner-shop-products'] });
            queryClient.invalidateQueries({ queryKey: ['owner-dashboard-products'] });
            queryClient.invalidateQueries({ queryKey: ['customer-shop-products'] });
            queryClient.invalidateQueries({ queryKey: ['customer-featured-products-home'] });
            queryClient.invalidateQueries({ queryKey: ['customer-all-products'] });
            showToast('Product added to your shop.', 'success');
            setSelectedProduct(null);
        },
        onError: (err: unknown) => {
            setUploadProgress(null);
            const msg = getApiErrorMessage(err, 'Failed to add product to your shop.');
            setFormError(msg);
            showToast(msg, 'error');
        },
    });

    function handleAssign(e: FormEvent) {
        e.preventDefault();
        setFormError(null);
        assignMutation.mutate();
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Shared Product Catalog</h1>
                    <p className="text-sm text-slate-500">
                        Select any product from the shared catalog to list it in your shop with your
                        own price and thumbnail.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/owner/my-products"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors"
                    >
                        <ArrowLeftIcon className="w-3.5 h-3.5" />
                        <span>Back to My Listings</span>
                    </Link>
                    <Link
                        to="/owner/create-product"
                        className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm"
                    >
                        + Create New Product
                    </Link>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 flex gap-4">
                <input
                    type="text"
                    placeholder="Search available products in shared catalog..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    className="max-w-md w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {isLoading && <Spinner />}
            {error && (
                <Alert
                    type="error"
                    message="Failed to load catalog products. Ensure you have an active shop."
                />
            )}

            {!isLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.length === 0 ? (
                        <div className="col-span-full py-16 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                            No unassigned products available in the catalog. All products may
                            already be added to your store!
                        </div>
                    ) : (
                        products.map((prod) => (
                            <div
                                key={prod.id}
                                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                            >
                                <div className="h-44 bg-slate-100 flex items-center justify-center p-4">
                                    <SafeImage
                                        src={prod.photo}
                                        alt={prod.name}
                                        fallbackType="product"
                                        className="max-h-full max-w-full object-contain"
                                    />
                                </div>

                                <div className="p-5 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                            <span>SKU: {prod.sku}</span>
                                            {prod.is_assigned && (
                                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                                                    In Your Shop
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-base font-semibold text-slate-900 line-clamp-1">
                                            {prod.name}
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Base Price:{' '}
                                            <span className="font-bold text-slate-800">
                                                ${Number(prod.price).toFixed(2)}
                                            </span>
                                        </p>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        {prod.is_assigned ? (
                                            <button
                                                type="button"
                                                disabled
                                                className="w-full py-2 px-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold text-center cursor-default"
                                            >
                                                Already Listed in Shop
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => openAssignModal(prod)}
                                                className="w-full py-2 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-xs font-semibold transition-colors text-center"
                                            >
                                                + Add to My Shop
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
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

            {/* Modal: Add to Shop with Custom Overrides */}
            <Modal
                isOpen={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
                title={selectedProduct ? `List in Your Shop: ${selectedProduct.name}` : 'List in Your Shop'}
                size="md"
            >
                {selectedProduct && (
                    <div>
                        {formError && (
                            <div className="mb-4">
                                <Alert type="error" message={formError} />
                            </div>
                        )}

                        <form onSubmit={handleAssign} className="space-y-4">
                            <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
                                <p>
                                    Catalog Base Price:{' '}
                                    <span className="font-bold">
                                        ${Number(selectedProduct.price).toFixed(2)}
                                    </span>
                                </p>
                                <p className="text-slate-400">
                                    You can keep the base price or set a custom price for your shop.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Custom Shop Product Title (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={overrideName}
                                    onChange={(e) => setOverrideName(e.target.value)}
                                    placeholder={`Leave empty to use "${selectedProduct.name}"`}
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Custom Shop Price ($)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={overridePrice}
                                    onChange={(e) => setOverridePrice(e.target.value)}
                                    placeholder={`Leave empty to use base price ($${selectedProduct.price})`}
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Shop-Specific Details / Warranty (Optional)
                                </label>
                                <textarea
                                    rows={3}
                                    value={overrideDescription}
                                    onChange={(e) => setOverrideDescription(e.target.value)}
                                    placeholder="Add any store-specific details, special shipping rules, or return policy..."
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <ImageUploadField
                                label="Custom Shop Thumbnail"
                                file={overrideThumbnail}
                                onChange={setOverrideThumbnail}
                                currentImageUrl={selectedProduct.photo}
                                helperText="Optional. If omitted, the default catalog product image will be used."
                                progress={uploadProgress}
                            />

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setSelectedProduct(null)}
                                    className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={assignMutation.isPending}
                                    className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50"
                                >
                                    {assignMutation.isPending ? 'Adding...' : 'Confirm & Add to Shop'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </Modal>
        </div>
    );
}
