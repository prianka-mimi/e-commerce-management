import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customerService } from '@/services/customer';
import { useCart } from '@/contexts/CartContext';
import { Spinner, Alert, Pagination } from '@/components/ui';
import { SafeImage } from '@/components/SafeImage';
import { MapPinIcon, PhoneIcon, CartIcon, CheckIcon, XIcon } from '@/components/Icons';
import type { CustomerShopProduct, Company, PaginatedData } from '@/types';

const SHOP_BANNERS: Record<number, string> = {
    1: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80',
    2: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1200&auto=format&fit=crop&q=80',
};

export default function ShopProductsPage() {
    const navigate = useNavigate();
    const { shopId } = useParams<{ shopId: string }>();
    const companyId = Number(shopId);
    const [page, setPage] = useState(1);
    const [nameFilter, setNameFilter] = useState('');
    const { addToCart, isInCart } = useCart();

    // Fetch shop details
    const { data: shopData } = useQuery({
        queryKey: ['customer-shop-detail', companyId],
        queryFn: async () => {
            const res = await customerService.shop(companyId);
            const raw = res.data?.data as Record<string, unknown> | undefined;
            if (raw && typeof raw === 'object' && 'data' in raw && raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data) && 'id' in raw.data) {
                return raw.data as Company;
            }
            if (raw && typeof raw === 'object' && 'id' in raw) {
                return raw as unknown as Company;
            }
            return null;
        },
        enabled: !isNaN(companyId),
    });

    // Fetch products assigned to this shop
    const { data, isLoading, error } = useQuery({
        queryKey: ['customer-shop-products', companyId, page, nameFilter],
        queryFn: async () => {
            const res = await customerService.shopProducts(companyId, {
                page,
                name: nameFilter || undefined,
            });
            return res.data.data as PaginatedData<CustomerShopProduct>;
        },
        enabled: !isNaN(companyId),
    });

    const shop = shopData;
    const products = data?.data || [];
    const meta = data?.meta;

    const bannerUrl =
        SHOP_BANNERS[companyId] ||
        'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200&auto=format&fit=crop&q=80';

    function handleCardClick(e: React.MouseEvent, item: CustomerShopProduct) {
        if ((e.target as HTMLElement).closest('button')) {
            return;
        }
        navigate(`/shops/${companyId}/products/${item.id}`);
    }

    function handleQuickAdd(e: React.MouseEvent, item: CustomerShopProduct) {
        e.preventDefault();
        e.stopPropagation();

        if ((item.stock ?? 0) <= 0 || isInCart(item.id)) return;

        addToCart({
            shopProductId: item.id,
            productId: item.product_id,
            companyId: companyId,
            companyName: shop?.name || item.company_name || 'Store',
            name: item.name,
            price: Number(item.price),
            thumbnail: item.thumbnail,
            sku: item.sku,
            maxStock: item.stock ?? 0,
        });
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center text-sm font-medium text-slate-500">
                <Link to="/" className="hover:text-indigo-600 transition-colors">
                    Stores
                </Link>
                <span className="mx-2 text-slate-300">/</span>
                <span className="text-slate-900 font-semibold truncate">
                    {shop?.name || `Shop #${companyId}`}
                </span>
            </nav>

            {/* Shop Header Banner */}
            <div className="relative rounded-3xl overflow-hidden bg-slate-950 text-white shadow-xl border border-slate-800">
                <div className="h-48 sm:h-64 relative overflow-hidden">
                    <img
                        src={bannerUrl}
                        alt={shop?.name || 'Shop Storefront'}
                        className="w-full h-full object-cover opacity-75"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                </div>

                <div className="p-6 sm:p-8 relative -mt-16 sm:-mt-20">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                        <div className="flex items-start sm:items-end gap-5">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-2 shadow-2xl border-2 border-white overflow-hidden shrink-0">
                                <div className="w-full h-full rounded-xl overflow-hidden bg-slate-100">
                                    <SafeImage
                                        src={shop?.logo}
                                        alt={shop?.name || 'Shop'}
                                        fallbackType="shop"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                            <div className="pt-2">
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                        {shop?.name || 'Merchant Store'}
                                    </h1>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                                        <CheckIcon className="w-3 h-3 text-emerald-400" />
                                        <span>Verified</span>
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-300 max-w-xl mt-1.5 leading-relaxed">
                                    {shop?.sort_description ||
                                        shop?.description ||
                                        'Official merchant store with curated inventory and exclusive pricing.'}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 text-xs text-slate-300">
                            {shop?.address && (
                                <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-md">
                                    <MapPinIcon className="w-3.5 h-3.5 text-indigo-300" />
                                    <span>{shop.address}</span>
                                </span>
                            )}
                            {shop?.phone && (
                                <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-md">
                                    <PhoneIcon className="w-3.5 h-3.5 text-indigo-300" />
                                    <span>{shop.phone}</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Products Search & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        Store Inventory & Pricing
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        Click on any product to view full specifications, warranty terms, and purchase.
                    </p>
                </div>
                <div className="w-full sm:w-72">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search products in this shop..."
                            value={nameFilter}
                            onChange={(e) => {
                                setNameFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full pl-4 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
                        />
                        {nameFilter && (
                            <button
                                onClick={() => setNameFilter('')}
                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-sm"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {isLoading && <Spinner />}

            {error && (
                <Alert
                    type="error"
                    message="Failed to load products for this shop. Please verify the store is active."
                />
            )}

            {!isLoading && products.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-xs">
                    <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No products available</h3>
                    <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                        This store currently does not have active products matching your filter.
                    </p>
                </div>
            )}

            {/* Products Grid - Single Click Opens Product Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((item) => {
                    const inCart = isInCart(item.id);
                    const stockCount = item.stock ?? 0;
                    const isOutOfStock = stockCount <= 0;

                    return (
                        <div
                            key={item.id}
                            onClick={(e) => handleCardClick(e, item)}
                            className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col hover:-translate-y-1 cursor-pointer"
                            title={`Click to view details for ${item.name}`}
                        >
                            {/* Thumbnail (Special deal badge removed) */}
                            <div className="h-56 bg-slate-50 p-6 flex items-center justify-center relative overflow-hidden">
                                <SafeImage
                                    src={item.thumbnail}
                                    alt={item.name}
                                    fallbackType="product"
                                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                                />
                                {item.sku && (
                                    <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-slate-600 font-mono text-[10px] px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                                        {item.sku}
                                    </span>
                                )}
                            </div>

                            {/* Card Content */}
                            <div className="p-5 flex-1 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                                        {item.name}
                                    </h3>

                                    {/* Stock Indicator */}
                                    <div className="mt-2.5 flex items-center gap-1.5 text-xs">
                                        {!isOutOfStock ? (
                                            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                In Stock ({stockCount} units)
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 text-rose-500 font-semibold">
                                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                                Out of Stock
                                            </span>
                                        )}
                                    </div>

                                    {item.description && (
                                        <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                            {item.description}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                                    <div>
                                        <span className="block text-lg font-black text-slate-900">
                                            ${Number(item.price).toFixed(2)}
                                        </span>
                                        {item.has_discount && item.original_price && (
                                            <span className="text-xs text-slate-400 line-through">
                                                ${Number(item.original_price).toFixed(2)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Add to Cart or In Cart state */}
                                    {inCart ? (
                                        <button
                                            type="button"
                                            disabled
                                            className="py-2 px-3 rounded-xl font-semibold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default flex items-center gap-1.5 shrink-0 shadow-2xs"
                                            title="Item is already in your cart"
                                        >
                                            <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>In Cart</span>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={isOutOfStock}
                                            onClick={(e) => handleQuickAdd(e, item)}
                                            className={`py-2 px-3 rounded-xl font-medium text-xs transition-colors shadow-2xs flex items-center gap-1.5 shrink-0 ${
                                                isOutOfStock
                                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                    : 'bg-slate-900 hover:bg-indigo-600 text-white hover:shadow-indigo-500/25 active:scale-95'
                                            }`}
                                            title={isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                                        >
                                            <CartIcon className="w-3.5 h-3.5" />
                                            <span>Add</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {meta && meta.total > 20 && meta.last_page > 1 && (
                <div className="pt-6">
                    <Pagination
                        currentPage={meta.current_page}
                        lastPage={meta.last_page}
                        total={meta.total}
                        onPageChange={(p) => setPage(p)}
                    />
                </div>
            )}
        </div>
    );
}
