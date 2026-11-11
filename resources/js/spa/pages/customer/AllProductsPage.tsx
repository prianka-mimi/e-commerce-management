import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customerService } from '@/services/customer';
import { useCart } from '@/contexts/CartContext';
import { Spinner, Alert } from '@/components/ui';
import { SafeImage } from '@/components/SafeImage';
import {
    SearchIcon,
    FilterIcon,
    StoreIcon,
    CartIcon,
    CheckIcon,
    PackageIcon,
    TagIcon,
    XIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from '@/components/Icons';
import type { Company, CustomerShopProduct, PaginatedData } from '@/types';

const ITEMS_PER_PAGE = 20;

const PRICE_PRESETS = [
    { label: 'All', min: '', max: '' },
    { label: 'Under $50', min: '0', max: '50' },
    { label: '$50 - $100', min: '50', max: '100' },
    { label: '$100 - $250', min: '100', max: '250' },
    { label: '$250+', min: '250', max: '' },
];

export default function AllProductsPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialStore = searchParams.get('store');

    const [selectedShopId, setSelectedShopId] = useState<number | null>(
        initialStore ? Number(initialStore) : null
    );
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [storeSearch, setStoreSearch] = useState('');
    const [minPrice, setMinPrice] = useState<string>('');
    const [maxPrice, setMaxPrice] = useState<string>('');
    const [inStockOnly, setInStockOnly] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);

    const { addToCart, isInCart } = useCart();

    // Sync selected store from query params
    useEffect(() => {
        const storeFromUrl = searchParams.get('store');
        setSelectedShopId(storeFromUrl ? Number(storeFromUrl) : null);
    }, [searchParams]);

    // Reset pagination to page 1 whenever any filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedShopId, search, minPrice, maxPrice, inStockOnly]);

    // Fetch active shops for sidebar filter
    const { data: shopsData } = useQuery({
        queryKey: ['customer-shops-filter-list'],
        queryFn: async () => {
            const res = await customerService.shops({ per_page: 50 });
            return res.data.data as PaginatedData<Company>;
        },
    });

    // Fetch marketplace products
    const { data: rawProducts, isLoading, error } = useQuery({
        queryKey: ['customer-all-products', selectedShopId, search],
        queryFn: async () => {
            const res = await customerService.featuredProducts({
                company_id: selectedShopId || undefined,
                search: search || undefined,
                limit: 300,
            });
            const payload = res.data?.data as unknown;
            if (Array.isArray(payload)) {
                return payload as CustomerShopProduct[];
            }
            if (payload && typeof payload === 'object' && 'data' in payload && Array.isArray((payload as { data: unknown }).data)) {
                return (payload as { data: CustomerShopProduct[] }).data;
            }
            return [];
        },
    });

    const shops = shopsData?.data || [];
    const productsList = rawProducts || [];
    const selectedShop = shops.find((s) => s.id === selectedShopId);

    // Sort stores by product quantity descending (most products first)
    const sortedStores = useMemo(() => {
        return [...shops].sort((a, b) => (b.shop_products_count ?? 0) - (a.shop_products_count ?? 0));
    }, [shops]);

    // Display Top 6 stores by default; if storeSearch is active, search all stores
    const displayedStores = useMemo(() => {
        if (!storeSearch.trim()) {
            const top6 = sortedStores.slice(0, 6);
            if (selectedShopId && !top6.some((s) => s.id === selectedShopId)) {
                const current = sortedStores.find((s) => s.id === selectedShopId);
                if (current) return [...top6, current];
            }
            return top6;
        }

        const query = storeSearch.trim().toLowerCase();
        return sortedStores.filter((s) => s.name.toLowerCase().includes(query));
    }, [sortedStores, storeSearch, selectedShopId]);

    // Apply client-side price and stock filters
    const filteredProducts = useMemo(() => {
        const minVal = minPrice !== '' ? Number(minPrice) : 0;
        const maxVal = maxPrice !== '' ? Number(maxPrice) : Infinity;

        return productsList.filter((item) => {
            // Price filter
            const price = Number(item.price);
            if (price < minVal || price > maxVal) {
                return false;
            }

            // Stock filter
            if (inStockOnly) {
                const stock = item.stock ?? 0;
                if (stock <= 0) return false;
            }
            return true;
        });
    }, [productsList, minPrice, maxPrice, inStockOnly]);

    // Pagination calculations
    const totalItems = filteredProducts.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredProducts, currentPage]);

    const startIndex = totalItems > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
    const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

    function handleStoreChange(shopId: number | null) {
        setSelectedShopId(shopId);
        const nextParams = new URLSearchParams(searchParams);
        if (shopId) {
            nextParams.set('store', String(shopId));
        } else {
            nextParams.delete('store');
        }
        setSearchParams(nextParams);
    }

    function handleResetAll() {
        setSelectedShopId(null);
        setSearch('');
        setStoreSearch('');
        setMinPrice('');
        setMaxPrice('');
        setInStockOnly(false);
        setCurrentPage(1);
        setSearchParams({});
    }

    function handlePricePreset(min: string, max: string) {
        setMinPrice(min);
        setMaxPrice(max);
    }

    function handleCardClick(e: React.MouseEvent, item: CustomerShopProduct) {
        if ((e.target as HTMLElement).closest('button')) {
            return;
        }
        navigate(`/shops/${item.company_id || 1}/products/${item.id}`);
    }

    function handleQuickAdd(e: React.MouseEvent, item: CustomerShopProduct) {
        e.preventDefault();
        e.stopPropagation();

        if ((item.stock ?? 0) <= 0 || isInCart(item.id)) return;

        addToCart({
            shopProductId: item.id,
            productId: item.product_id,
            companyId: item.company_id || 1,
            companyName: item.company_name || 'Store',
            name: item.name,
            price: Number(item.price),
            thumbnail: item.thumbnail,
            sku: item.sku,
            maxStock: item.stock ?? 0,
        });
    }

    function handlePageChange(newPage: number) {
        if (newPage < 1 || newPage > totalPages) return;
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }

    const hasActiveFilters =
        selectedShopId !== null ||
        search !== '' ||
        minPrice !== '' ||
        maxPrice !== '' ||
        inStockOnly;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Marketplace Products
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Filter by certified store, availability, and custom price range.
                    </p>
                </div>

                {/* Mobile Filter Toggle Button */}
                <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                    className="lg:hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-2xs self-start"
                >
                    <FilterIcon className="w-4 h-4 text-white" />
                    <span>{mobileFiltersOpen ? 'Hide Filters' : 'Show Filters'}</span>
                    {hasActiveFilters && (
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    )}
                </button>
            </div>

            {/* Standard E-Commerce Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* ======================================================== */}
                {/* LEFT SIDEBAR FILTERS (Sticky on Scroll, No Scrollbars)  */}
                {/* ======================================================== */}
                <aside
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    className={`lg:col-span-3 sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto space-y-6 no-scrollbar ${
                        mobileFiltersOpen ? 'block' : 'hidden lg:block'
                    }`}
                >
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-md space-y-6">
                        {/* Filter Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                                <FilterIcon className="w-4 h-4 text-indigo-600" />
                                <span>Filters</span>
                            </div>

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={handleResetAll}
                                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors"
                                >
                                    Reset All
                                </button>
                            )}
                        </div>

                        {/* ==================================================== */}
                        {/* STORE FILTER SECTION (Top 6 + Real-Time Search)      */}
                        {/* ==================================================== */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Stores
                                </h3>
                                {!storeSearch && sortedStores.length > 6 && (
                                    <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md">
                                        Top 6
                                    </span>
                                )}
                            </div>

                            {/* Store Search Input */}
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <SearchIcon className="w-3.5 h-3.5" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search stores..."
                                    value={storeSearch}
                                    onChange={(e) => setStoreSearch(e.target.value)}
                                    className="w-full pl-8 pr-7 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white text-slate-800 placeholder:text-slate-400 font-medium transition-all"
                                />
                                {storeSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setStoreSearch('')}
                                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                                    >
                                        <XIcon className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Stores List: No side scrollbar, clean 3D cards */}
                            <div
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar pr-0.5"
                            >
                                {/* All Stores Option */}
                                <label
                                    onClick={() => handleStoreChange(null)}
                                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${
                                        selectedShopId === null
                                            ? 'bg-indigo-50 border-indigo-600 text-indigo-950 font-bold shadow-xs'
                                            : 'bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <input
                                            type="radio"
                                            name="store_filter"
                                            checked={selectedShopId === null}
                                            onChange={() => handleStoreChange(null)}
                                            className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                        <StoreIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                        <span className="text-xs truncate">All Stores</span>
                                    </div>
                                    <span className="text-[11px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80 shrink-0">
                                        {productsList.length}
                                    </span>
                                </label>

                                {displayedStores.length === 0 ? (
                                    <div className="text-center py-4 px-2 text-slate-400 text-xs">
                                        No stores found matching "{storeSearch}"
                                    </div>
                                ) : (
                                    displayedStores.map((shop) => {
                                        const isSelected = selectedShopId === shop.id;

                                        return (
                                            <label
                                                key={shop.id}
                                                onClick={() => handleStoreChange(shop.id)}
                                                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${
                                                    isSelected
                                                        ? 'bg-indigo-50 border-indigo-600 text-indigo-950 font-bold shadow-xs'
                                                        : 'bg-white border-slate-200/80 text-slate-800 hover:bg-slate-50 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <input
                                                        type="radio"
                                                        name="store_filter"
                                                        checked={isSelected}
                                                        onChange={() => handleStoreChange(shop.id)}
                                                        className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                    <div className="w-5 h-5 rounded-lg bg-slate-50 overflow-hidden shrink-0 border border-slate-200 p-0.5 shadow-2xs flex items-center justify-center">
                                                        <SafeImage
                                                            src={shop.logo}
                                                            alt={shop.name}
                                                            fallbackType="shop"
                                                            className="w-full h-full object-cover rounded-sm"
                                                        />
                                                    </div>
                                                    <span className="text-xs truncate font-medium">{shop.name}</span>
                                                </div>
                                                <span className="text-[11px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80 shrink-0 ml-1">
                                                    {shop.shop_products_count ?? 0}
                                                </span>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* ==================================================== */}
                        {/* PRICE RANGE (Custom Min & Max Inputs + Presets)      */}
                        {/* ==================================================== */}
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Price Range
                                </h3>
                                {(minPrice !== '' || maxPrice !== '') && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMinPrice('');
                                            setMaxPrice('');
                                        }}
                                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            {/* Dual Min & Max Numeric Inputs */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                                        Min Price ($)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs font-bold">
                                            $
                                        </span>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={minPrice}
                                            onChange={(e) => setMinPrice(e.target.value)}
                                            className="w-full pl-6 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white text-slate-900 font-semibold transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                                        Max Price ($)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs font-bold">
                                            $
                                        </span>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="500+"
                                            value={maxPrice}
                                            onChange={(e) => setMaxPrice(e.target.value)}
                                            className="w-full pl-6 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white text-slate-900 font-semibold transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Quick Price Preset Chips */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {PRICE_PRESETS.map((preset) => {
                                    const isMatch =
                                        minPrice === preset.min && maxPrice === preset.max;
                                    return (
                                        <button
                                            key={preset.label}
                                            type="button"
                                            onClick={() => handlePricePreset(preset.min, preset.max)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                                isMatch
                                                    ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                                                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                                            }`}
                                        >
                                            {preset.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ==================================================== */}
                        {/* AVAILABILITY / IN STOCK FILTER                       */}
                        {/* ==================================================== */}
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Availability
                            </h3>
                            <label className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={inStockOnly}
                                    onChange={(e) => setInStockOnly(e.target.checked)}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                                <span className="font-medium">In Stock Items Only</span>
                            </label>
                        </div>
                    </div>
                </aside>

                {/* ======================================================== */}
                {/* RIGHT MAIN CATALOG (4 Products Per Row + Pagination)    */}
                {/* ======================================================== */}
                <main className="lg:col-span-9 space-y-6">
                    {/* Clear High-Contrast Search Input */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-md space-y-3">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <div className="relative flex-1 flex items-center bg-slate-50 rounded-xl border border-slate-200 transition-all duration-200 focus-within:border-indigo-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-100">
                                <div className="pl-3.5 pr-2 text-indigo-600 shrink-0">
                                    <SearchIcon className="w-5 h-5 text-indigo-600" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search products by title, SKU, or specs..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                                    className="w-full py-2.5 px-2 text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-0 bg-transparent border-none outline-none shadow-none ring-0"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        className="p-1.5 mr-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
                                        title="Clear search"
                                    >
                                        <XIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center justify-end shrink-0">
                                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold">
                                    <span>Showing</span>
                                    <strong className="text-indigo-600 font-black">{totalItems}</strong>
                                    <span>items</span>
                                </span>
                            </div>
                        </div>

                        {/* Active Filter Chips */}
                        {hasActiveFilters && (
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                                <span className="text-slate-400 text-[11px] font-semibold">
                                    Active Filters:
                                </span>
                                {selectedShop && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                                        <StoreIcon className="w-3 h-3 text-indigo-600" />
                                        <span>{selectedShop.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleStoreChange(null)}
                                            className="hover:text-indigo-900"
                                        >
                                            <XIcon className="w-3 h-3" />
                                        </button>
                                    </span>
                                )}
                                {(minPrice !== '' || maxPrice !== '') && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-semibold border border-purple-100">
                                        <TagIcon className="w-3 h-3 text-purple-600" />
                                        <span>
                                            ${minPrice || '0'} - {maxPrice ? `$${maxPrice}` : 'Above'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMinPrice('');
                                                setMaxPrice('');
                                            }}
                                            className="hover:text-purple-900"
                                        >
                                            <XIcon className="w-3 h-3" />
                                        </button>
                                    </span>
                                )}
                                {inStockOnly && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                                        <PackageIcon className="w-3 h-3 text-emerald-600" />
                                        <span>In Stock Only</span>
                                        <button
                                            type="button"
                                            onClick={() => setInStockOnly(false)}
                                            className="hover:text-emerald-900"
                                        >
                                            <XIcon className="w-3 h-3" />
                                        </button>
                                    </span>
                                )}
                                {search && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                                        <SearchIcon className="w-3 h-3 text-slate-500" />
                                        <span>"{search}"</span>
                                        <button
                                            type="button"
                                            onClick={() => setSearch('')}
                                            className="hover:text-slate-900"
                                        >
                                            <XIcon className="w-3 h-3" />
                                        </button>
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={handleResetAll}
                                    className="text-[11px] font-bold text-rose-600 hover:underline ml-auto"
                                >
                                    Clear All
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Loading & Error States */}
                    {isLoading && (
                        <div className="py-20 flex justify-center">
                            <Spinner />
                        </div>
                    )}

                    {error && (
                        <Alert
                            type="error"
                            message="Failed to load products. Please check your backend connection."
                        />
                    )}

                    {/* Empty State */}
                    {!isLoading && totalItems === 0 && (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/90 shadow-md space-y-4">
                            <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                <PackageIcon className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">
                                    No products matched your filters
                                </h3>
                                <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                                    Try selecting another store, adjusting the price range, or clearing the search query.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleResetAll}
                                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors shadow-2xs"
                            >
                                Reset All Filters
                            </button>
                        </div>
                    )}

                    {/* Products Grid - 3D Cards with Natural Shadow Lift */}
                    {!isLoading && totalItems > 0 && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                                {paginatedProducts.map((item) => {
                                    const inCart = isInCart(item.id);
                                    const stockCount = item.stock ?? 0;
                                    const isOutOfStock = stockCount <= 0;

                                    return (
                                        <div
                                            key={item.id}
                                            onClick={(e) => handleCardClick(e, item)}
                                            className="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-md hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 flex flex-col cursor-pointer"
                                            title={`Click to view details for ${item.name}`}
                                        >
                                            <div className="h-48 bg-slate-50 p-4 flex items-center justify-center relative overflow-hidden border-b border-slate-100">
                                                <SafeImage
                                                    src={item.thumbnail}
                                                    alt={item.name}
                                                    fallbackType="product"
                                                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                                                />

                                                {item.company_name && (
                                                    <span className="absolute bottom-2.5 left-2.5 bg-white/95 backdrop-blur-md text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs max-w-[85%] truncate flex items-center gap-1">
                                                        <StoreIcon className="w-3 h-3 text-slate-500 shrink-0" />
                                                        <span className="truncate">{item.company_name}</span>
                                                    </span>
                                                )}
                                            </div>

                                            <div className="p-4 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                                                        {item.name}
                                                    </h3>

                                                    <div className="mt-2 flex items-center gap-1.5 text-xs">
                                                        {!isOutOfStock ? (
                                                            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                In Stock ({stockCount})
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 text-rose-500 font-semibold text-[11px]">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                                Out of Stock
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                                                    <div>
                                                        <span className="text-base sm:text-lg font-black text-slate-900">
                                                            ${Number(item.price).toFixed(2)}
                                                        </span>
                                                        {item.has_discount && item.original_price && (
                                                            <span className="ml-1 text-[11px] text-slate-400 line-through">
                                                                ${Number(item.original_price).toFixed(2)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {inCart ? (
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="py-1.5 px-3 rounded-xl font-semibold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default flex items-center gap-1 shrink-0 shadow-2xs"
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
                                                            className={`py-1.5 px-3 rounded-xl font-medium text-xs transition-all shadow-2xs flex items-center gap-1 shrink-0 ${
                                                                isOutOfStock
                                                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                                    : 'bg-slate-900 hover:bg-indigo-600 text-white hover:shadow-indigo-500/25 active:scale-95'
                                                            }`}
                                                            title={isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                                                        >
                                                            <CartIcon className="w-3.5 h-3.5 text-white" />
                                                            <span>Add</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ==================================================== */}
                            {/* PAGINATION CONTROLS (Displayed strictly after 20 items) */}
                            {/* ==================================================== */}
                            {totalItems > 20 && totalPages > 1 && (
                                <div className="mt-10 p-4 bg-white rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                                    <div className="text-xs text-slate-600 font-medium">
                                        Showing <strong className="text-slate-950 font-bold">{startIndex}</strong> to{' '}
                                        <strong className="text-slate-950 font-bold">{endIndex}</strong> of{' '}
                                        <strong className="text-indigo-600 font-bold">{totalItems}</strong> products
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            disabled={currentPage === 1}
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors shadow-2xs"
                                        >
                                            <ChevronLeftIcon className="w-3.5 h-3.5" />
                                            <span>Previous</span>
                                        </button>

                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                            <button
                                                key={page}
                                                type="button"
                                                onClick={() => handlePageChange(page)}
                                                className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                                                    page === currentPage
                                                        ? 'bg-indigo-600 text-white shadow-xs'
                                                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        ))}

                                        <button
                                            type="button"
                                            disabled={currentPage === totalPages}
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors shadow-2xs"
                                        >
                                            <span>Next</span>
                                            <ChevronRightIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
