import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customerService } from '@/services/customer';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { CheckoutModal } from '@/components/CheckoutModal';
import { Spinner, Alert, Modal } from '@/components/ui';
import { SafeImage } from '@/components/SafeImage';
import {
    CartIcon,
    CheckIcon,
    ShieldIcon,
    TruckIcon,
    LockIcon,
    PlusIcon,
    MinusIcon,
    ArrowRightIcon,
    StoreIcon,
} from '@/components/Icons';
import type { CustomerShopProduct, Company } from '@/types';

export default function ProductDetailPage() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { shopId, productId } = useParams<{ shopId: string; productId: string }>();
    const companyId = Number(shopId);
    const shopProductId = Number(productId);

    const { addToCart, isInCart } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [showAuthNotice, setShowAuthNotice] = useState(false);

    // Guarantee viewport is scrolled to top on mount or product change
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [shopProductId]);

    function unwrapData<T>(response: unknown): T | null {
        if (!response || typeof response !== 'object') return null;
        let cur: unknown = (response as { data?: unknown }).data !== undefined
            ? (response as { data?: unknown }).data
            : response;
        while (
            cur &&
            typeof cur === 'object' &&
            !Array.isArray(cur) &&
            'data' in cur &&
            (cur as { data?: unknown }).data &&
            typeof (cur as { data?: unknown }).data === 'object' &&
            !Array.isArray((cur as { data?: unknown }).data)
        ) {
            cur = (cur as { data?: unknown }).data;
        }
        if (!cur || typeof cur !== 'object' || Array.isArray(cur) || !('id' in cur)) {
            return null;
        }
        return cur as T;
    }

    // Fetch shop info
    const { data: shop } = useQuery({
        queryKey: ['customer-shop-detail', companyId],
        queryFn: async () => {
            const res = await customerService.shop(companyId);
            return unwrapData<Company>(res.data);
        },
        enabled: !isNaN(companyId),
    });

    // Fetch product detail
    const { data: product, isLoading, error } = useQuery({
        queryKey: ['customer-shop-product-detail', companyId, shopProductId],
        queryFn: async () => {
            const res = await customerService.shopProduct(companyId, shopProductId);
            return unwrapData<CustomerShopProduct>(res.data);
        },
        enabled: !isNaN(companyId) && !isNaN(shopProductId),
    });

    const stockCount = product?.stock ?? 0;
    const isOutOfStock = stockCount <= 0;
    const isAlreadyInCart = product ? isInCart(product.id) : false;

    useEffect(() => {
        if (stockCount > 0 && quantity > stockCount) {
            setQuantity(stockCount);
        } else if (stockCount === 0 && quantity !== 1) {
            setQuantity(1);
        }
    }, [stockCount, quantity]);

    function handleAddToCart() {
        if (!product || isAlreadyInCart || isOutOfStock) return;
        addToCart(
            {
                shopProductId: product.id,
                productId: product.product_id,
                companyId: companyId,
                companyName: shop?.name || product.company_name || 'Store',
                name: product.name,
                price: Number(product.price) || 0,
                thumbnail: product.thumbnail,
                sku: product.sku,
                maxStock: stockCount,
            },
            Math.min(quantity, stockCount)
        );
    }

    function handleBuyNow() {
        if (!product || isOutOfStock) return;

        addToCart(
            {
                shopProductId: product.id,
                productId: product.product_id,
                companyId: companyId,
                companyName: shop?.name || product.company_name || 'Store',
                name: product.name,
                price: Number(product.price) || 0,
                thumbnail: product.thumbnail,
                sku: product.sku,
                maxStock: stockCount,
            },
            Math.min(quantity, stockCount)
        );

        if (!isAuthenticated) {
            navigate('/login?redirect=checkout');
            return;
        }

        setIsCheckoutOpen(true);
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center text-sm font-medium text-slate-500">
                <Link to="/products" className="hover:text-indigo-600 transition-colors">
                    All Products
                </Link>
                <span className="mx-2 text-slate-300">/</span>
                <Link
                    to={`/products?store=${companyId}`}
                    className="hover:text-indigo-600 transition-colors truncate max-w-[180px]"
                >
                    {shop?.name || product?.company_name || `Shop #${companyId}`}
                </Link>
                <span className="mx-2 text-slate-300">/</span>
                <span className="text-slate-900 font-semibold truncate max-w-[240px]">
                    {product?.name || 'Product Details'}
                </span>
            </nav>

            {isLoading && <Spinner />}

            {error && (
                <Alert
                    type="error"
                    message="Failed to load product details. This item may not be active in this shop's inventory."
                />
            )}

            {/* Registration Required Center Modal */}
            <Modal
                isOpen={showAuthNotice}
                onClose={() => setShowAuthNotice(false)}
                title="Registration Required"
            >
                <div className="space-y-5">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <LockIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-amber-950">
                                Authentication Required to Purchase
                            </h4>
                            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                                You must be logged in or registered to proceed to checkout and complete your order.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowAuthNotice(false)}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all flex items-center gap-1.5"
                        >
                            <span>Login / Register Now</span>
                            <ArrowRightIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </Modal>

            {product && (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 p-6 sm:p-10">
                    {/* Left: Product Image Column */}
                    <div className="lg:col-span-5 flex flex-col gap-4">
                        <div className="aspect-square bg-slate-50 rounded-2xl p-8 flex items-center justify-center border border-slate-100 relative overflow-hidden group">
                            <SafeImage
                                src={product.thumbnail}
                                alt={product.name}
                                fallbackType="product"
                                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
                            />
                        </div>

                        {/* Trust Badges */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-2.5 text-xs text-slate-600">
                                <ShieldIcon className="w-5 h-5 text-indigo-600 shrink-0" />
                                <div>
                                    <span className="font-bold text-slate-900 block">Verified Merchant</span>
                                    <span>Genuine Product</span>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-2.5 text-xs text-slate-600">
                                <TruckIcon className="w-5 h-5 text-indigo-600 shrink-0" />
                                <div>
                                    <span className="font-bold text-slate-900 block">Express Dispatch</span>
                                    <span>Direct from Store</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Product Details Column */}
                    <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                        <div className="space-y-4">
                            {/* Product Title */}
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                                {product.name}
                            </h1>

                            {/* Price Card */}
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-baseline gap-4">
                                <span className="text-3xl sm:text-4xl font-black text-slate-900">
                                    ${(Number(product.price) || 0).toFixed(2)}
                                </span>
                                {product.has_discount && product.original_price && (
                                    <span className="text-lg text-slate-400 line-through">
                                        ${(Number(product.original_price) || 0).toFixed(2)}
                                    </span>
                                )}
                            </div>

                            {/* Product SKU and Inventory */}
                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                                {product.sku && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-slate-400">SKU:</span>
                                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                            {product.sku}
                                        </span>
                                    </div>
                                )}
                                {!isOutOfStock ? (
                                    <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span>In Stock ({stockCount} units) & Ready to Dispatch</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-rose-500 font-semibold">
                                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                                        <span>Out of Stock</span>
                                    </div>
                                )}
                            </div>

                            {/* Shop / Product Description */}
                            <div className="pt-4 border-t border-slate-100 space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Product Description
                                </h3>
                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                                    {product.description ||
                                        'Standard manufacturer specifications and features apply.'}
                                </p>
                            </div>

                            {/* Seller Attribution Card */}
                            <div className="pt-4 border-t border-slate-100">
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-white p-1 shadow-xs border border-slate-200 overflow-hidden shrink-0">
                                            <SafeImage
                                                src={shop?.logo}
                                                alt={shop?.name || 'Shop'}
                                                fallbackType="shop"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                                Sold & Fulfilled by
                                            </span>
                                            <span className="text-sm font-bold text-slate-900 block truncate">
                                                {shop?.name || product.company_name || 'Verified Merchant'}
                                            </span>
                                        </div>
                                    </div>
                                    <Link
                                        to={`/products?store=${companyId}`}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs transition-colors shrink-0 flex items-center gap-1"
                                    >
                                        <span>View Store Catalog</span>
                                        <ArrowRightIcon className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Purchase & Cart Actions */}
                        <div className="pt-6 border-t border-slate-100 space-y-4">
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                {/* Quantity Stepper */}
                                {!isAlreadyInCart && !isOutOfStock && (
                                    <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center transition-colors shadow-2xs"
                                        >
                                            <MinusIcon className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="w-8 text-center font-bold text-sm text-slate-800">
                                            {quantity}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={quantity >= stockCount}
                                            onClick={() => setQuantity((q) => Math.min(Math.max(1, stockCount), q + 1))}
                                            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center transition-colors shadow-2xs disabled:opacity-40"
                                        >
                                            <PlusIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}

                                {/* Add to Cart / In Cart state */}
                                {isAlreadyInCart ? (
                                    <button
                                        type="button"
                                        disabled
                                        className="flex-1 w-full sm:w-auto py-3.5 px-6 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-sm flex items-center justify-center gap-2 cursor-default"
                                    >
                                        <CheckIcon className="w-4 h-4 text-emerald-600" />
                                        <span>Item Already in Cart</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={isOutOfStock}
                                        onClick={handleAddToCart}
                                        className={`flex-1 w-full sm:w-auto py-3.5 px-6 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${
                                            isOutOfStock
                                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                : 'bg-slate-900 hover:bg-slate-800 text-white'
                                        }`}
                                    >
                                        <CartIcon className="w-4 h-4" />
                                        <span>{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
                                    </button>
                                )}

                                {/* Buy Now */}
                                <button
                                    type="button"
                                    disabled={isOutOfStock}
                                    onClick={handleBuyNow}
                                    className={`flex-1 w-full sm:w-auto py-3.5 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                                        isOutOfStock
                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30'
                                    }`}
                                >
                                    <span>Buy Now (${((Number(product.price) || 0) * quantity).toFixed(2)})</span>
                                    <ArrowRightIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Direct Checkout Modal */}
            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
            />
        </div>
    );
}
