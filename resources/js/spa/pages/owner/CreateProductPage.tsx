import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import { productService } from '@/services/product';
import { shopProductService } from '@/services/shopProduct';
import { uploadImageChunked } from '@/services/upload';
import { getApiErrorMessage } from '@/services/http';
import { Alert } from '@/components/ui';
import { ImageUploadField } from '@/components/ImageUploadField';
import { ArrowLeftIcon } from '@/components/Icons';

export default function CreateProductPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const [name, setName] = useState('');
    const [sku, setSku] = useState(`SKU-${Date.now().toString().slice(-6)}`);
    const [price, setPrice] = useState('');
    const [cost, setCost] = useState('');
    const [stock, setStock] = useState('100');
    const [description, setDescription] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    const createMutation = useMutation({
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
            if (cost) fd.append('cost', cost);
            fd.append('stock', stock);
            fd.append('status', '1');
            if (description) fd.append('description', description);
            if (uploadedPhotoPath) fd.append('photo', uploadedPhotoPath);

            // 1. Create product in shared catalog
            const res = await productService.store(fd);
            const created = res.data.data as { id: number };

            // 2. Automatically assign newly created product to this shop owner's shop
            // Shop listing inherits the newly created catalog product photo automatically
            if (created?.id) {
                const assignFd = new FormData();
                assignFd.append('product_id', String(created.id));
                assignFd.append('price', price);
                await shopProductService.store(assignFd);
            }

            return res;
        },
        onSuccess: () => {
            setUploadProgress(null);
            queryClient.invalidateQueries({ queryKey: ['owner-shop-products'] });
            queryClient.invalidateQueries({ queryKey: ['owner-dashboard-products'] });
            queryClient.invalidateQueries({ queryKey: ['owner-catalog'] });
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            queryClient.invalidateQueries({ queryKey: ['customer-shop-products'] });
            queryClient.invalidateQueries({ queryKey: ['customer-featured-products-home'] });
            queryClient.invalidateQueries({ queryKey: ['customer-all-products'] });
            showToast('Product created and added to your shop.', 'success');
            navigate('/owner/my-products');
        },
        onError: (err: unknown) => {
            setUploadProgress(null);
            const msg = getApiErrorMessage(err, 'Failed to create and assign product.');
            setFormError(msg);
            showToast(msg, 'error');
        },
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setFormError(null);
        createMutation.mutate();
    }

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Create Your Product
                    </h1>
                    <p className="text-sm text-slate-500">
                        This product will be added to your shop and made available in the shared
                        catalog for other shop owners to browse and list.
                    </p>
                </div>
                <Link
                    to="/owner/my-products"
                    className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium shrink-0"
                >
                    <ArrowLeftIcon className="w-3.5 h-3.5" />
                    <span>Back to My Listings</span>
                </Link>
            </div>

            {formError && <Alert type="error" message={formError} />}

            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Product Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                placeholder="Wireless Bluetooth Earbuds"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                SKU *
                            </label>
                            <input
                                type="text"
                                required
                                value={sku}
                                onChange={(e) => setSku(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Price ($) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                placeholder="49.99"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Cost ($)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={cost}
                                onChange={(e) => setCost(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                placeholder="25.00"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Stock Quantity
                            </label>
                            <input
                                type="number"
                                value={stock}
                                onChange={(e) => setStock(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <ImageUploadField
                        label="Product Photo"
                        file={photoFile}
                        onChange={setPhotoFile}
                        progress={uploadProgress}
                    />

                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                            Description
                        </label>
                        <textarea
                            rows={4}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Detailed product specifications, features, and warranty..."
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="pt-4 border-t flex justify-end gap-3">
                        <Link
                            to="/owner/my-products"
                            className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="px-5 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50 shadow-sm"
                        >
                            {createMutation.isPending
                                ? 'Creating & Adding...'
                                : 'Publish to Catalog & Shop'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
