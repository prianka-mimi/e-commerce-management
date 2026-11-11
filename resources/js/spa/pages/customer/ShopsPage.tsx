import { useRef, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { customerService } from '@/services/customer';
import { useCart } from '@/contexts/CartContext';
import { Spinner, Alert } from '@/components/ui';
import { SafeImage } from '@/components/SafeImage';
import {
    SearchIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    StoreIcon,
    CartIcon,
    CheckIcon,
    ArrowRightIcon,
    PackageIcon,
    XIcon,
} from '@/components/Icons';
import type { Company, CustomerShopProduct, PaginatedData } from '@/types';

export default function ShopsPage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const { addToCart, isInCart } = useCart();
    const sliderRef = useRef<HTMLDivElement>(null);

    // Fetch active shops for slider
    const { data: shopsData, isLoading: shopsLoading, error: shopsError } = useQuery({
        queryKey: ['customer-shops-slider'],
        queryFn: async () => {
            const res = await customerService.shops({ per_page: 50 });
            return res.data.data as PaginatedData<Company>;
        },
    });

    // Fetch featured/recent marketplace products (20 latest items)
    const { data: productsData, isLoading: productsLoading, error: productsError } = useQuery({
        queryKey: ['customer-featured-products-home'],
        queryFn: async () => {
            const res = await customerService.featuredProducts({ limit: 20 });
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
    const featuredProducts = productsData || [];
    const [isSliderPaused, setIsSliderPaused] = useState(false);

    // Auto-slide merchants continuously forward in one direction with pause-on-hover
    useEffect(() => {
        if (isSliderPaused || !sliderRef.current || shops.length <= 1) return;

        const timer = setInterval(() => {
            const slider = sliderRef.current;
            if (!slider) return;

            const cardWidth = 220;
            const singleSetWidth = shops.length * cardWidth;

            // If scrolled past the first batch of shops, jump back seamlessly with zero animation
            if (slider.scrollLeft >= singleSetWidth) {
                slider.scrollLeft -= singleSetWidth;
            }

            // Always smoothly advance forward in one continuous direction
            slider.scrollBy({ left: cardWidth, behavior: 'smooth' });
        }, 2800);

        return () => clearInterval(timer);
    }, [isSliderPaused, shops.length]);

    // Horizontal slider scroll navigation
    const scrollSlider = (direction: 'left' | 'right') => {
        setIsSliderPaused(true);
        if (sliderRef.current) {
            const scrollOffset = direction === 'left' ? -240 : 240;
            sliderRef.current.scrollBy({ left: scrollOffset, behavior: 'smooth' });
        }
        // Resume auto-sliding after 4 seconds of inactivity
        setTimeout(() => setIsSliderPaused(false), 4000);
    };

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

    function handleSearchSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (search.trim()) {
            navigate(`/products?search=${encodeURIComponent(search.trim())}`);
        } else {
            navigate('/products');
        }
    }

    return (
        <div className="space-y-12 pb-20">
            {/* Hero Banner with High Contrast Search */}
            <section className="relative overflow-hidden bg-slate-950 text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
                <img
                    src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&auto=format&fit=crop&q=80"
                    alt="Marketplace Hero"
                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/50" />

                <div className="max-w-7xl mx-auto relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-indigo-300 text-xs font-semibold mb-4 backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Multi-Store Marketplace
                    </div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                        Explore Verified Stores & Products
                    </h1>
                    <p className="mt-3.5 max-w-2xl mx-auto text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
                        Discover independent merchant storefronts with custom pricing, active inventory, and instant fulfillment.
                    </p>

                    {/* Clean High-Contrast Seamless Search Pill */}
                    <form onSubmit={handleSearchSubmit} className="mt-8 max-w-2xl mx-auto">
                        <div className="relative flex items-center bg-white rounded-full shadow-2xl p-1.5 border border-white/20 transition-all duration-200 focus-within:ring-4 focus-within:ring-indigo-500/30">
                            <div className="pl-4 pr-1 text-slate-400 shrink-0">
                                <SearchIcon className="w-5 h-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search products by title, SKU, or store..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                                className="flex-1 min-w-0 py-3 px-3 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-0 bg-transparent border-none outline-none shadow-none ring-0"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 mr-1 rounded-full transition-colors"
                                    title="Clear search"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                type="submit"
                                className="px-7 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-all shrink-0 shadow-md shadow-indigo-600/30 active:scale-95"
                            >
                                Search
                            </button>
                        </div>
                    </form>
                </div>
            </section>

            {/* STORES SLIDER SECTION - Open, Clean Layout */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                        <div className="inline-flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Certified Merchants</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            Browse by Store
                        </h2>
                    </div>

                    {/* Slider Nav Arrows */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => scrollSlider('left')}
                            className="w-10 h-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 flex items-center justify-center transition-all shadow-xs hover:border-slate-300"
                            title="Previous store"
                        >
                            <ChevronLeftIcon className="w-4 h-4 text-slate-700" />
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollSlider('right')}
                            className="w-10 h-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 flex items-center justify-center transition-all shadow-xs hover:border-slate-300"
                            title="Next store"
                        >
                            <ChevronRightIcon className="w-4 h-4 text-slate-700" />
                        </button>
                    </div>
                </div>

                {shopsLoading && (
                    <div className="py-8 flex justify-center">
                        <Spinner />
                    </div>
                )}

                {shopsError && (
                    <Alert
                        type="error"
                        message="Unable to load stores. Please check network connection."
                    />
                )}

                {!shopsLoading && (
                    <div
                        ref={sliderRef}
                        onMouseEnter={() => setIsSliderPaused(true)}
                        onMouseLeave={() => setIsSliderPaused(false)}
                        onTouchStart={() => setIsSliderPaused(true)}
                        onTouchEnd={() => setIsSliderPaused(false)}
                        className="flex items-stretch gap-4 sm:gap-5 overflow-x-auto pb-6 pt-2 px-1 scroll-smooth focus:outline-none no-scrollbar"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {/* Render triplicated stores for infinite continuous forward sliding */}
                        {(shops.length > 0 ? [...shops, ...shops, ...shops] : []).map((shop, idx) => (
                            <Link
                                key={`${shop.id}-${idx}`}
                                to={`/products?store=${shop.id}`}
                                className="w-44 sm:w-52 shrink-0 p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white text-slate-800 shadow-md hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 flex flex-col items-center justify-between group text-center block cursor-pointer"
                                title={`View products from ${shop.name}`}
                            >
                                <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 p-2 shadow-inner overflow-hidden flex items-center justify-center mb-3 transition-transform group-hover:scale-105">
                                    <SafeImage
                                        src={shop.logo}
                                        alt={shop.name}
                                        fallbackType="shop"
                                        className="w-full h-full object-cover rounded-xl"
                                    />
                                </div>
                                <div className="w-full">
                                    <span className="text-xs sm:text-sm font-bold text-slate-900 truncate w-full block group-hover:text-indigo-600 transition-colors">
                                        {shop.name}
                                    </span>
                                    <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full transition-colors">
                                        {shop.shop_products_count ?? 0} Products
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* BROWSE ALL STORES CALLOUT BANNER */}
                <div className="p-5 rounded-2xl bg-slate-100/90 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-center gap-3.5 text-center sm:text-left">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                            <StoreIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-base font-bold text-slate-900">
                                Looking for all merchant products in one place?
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Filter by any store, compare exclusive prices, and browse the full global catalog.
                            </p>
                        </div>
                    </div>

                    <Link
                        to="/products"
                        className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs sm:text-sm transition-all shadow-sm flex items-center gap-2 shrink-0 active:scale-95"
                    >
                        <span>Browse All Products</span>
                        <ArrowRightIcon className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </section>

            {/* FEATURED PRODUCTS SHOWCASE SECTION - Open, Clean Layout */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <div>
                        <span className="text-indigo-600 font-bold text-xs uppercase tracking-wider block">
                            Marketplace Showcase
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                            Featured Products
                        </h2>
                    </div>

                    <Link
                        to="/products"
                        className="text-xs sm:text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                    >
                        <span>View All Products</span>
                        <ArrowRightIcon className="w-3.5 h-3.5" />
                    </Link>
                </div>

                <div>
                    {productsLoading && (
                        <div className="py-20 flex justify-center">
                            <Spinner />
                        </div>
                    )}

                    {productsError && (
                        <Alert
                            type="error"
                            message="Failed to load featured products. Please check the backend connection."
                        />
                    )}

                    {!productsLoading && featuredProducts.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                            {featuredProducts.map((item) => {
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
                    )}
                </div>
            </section>
        </div>
    );
}
