import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { shopProductService } from '@/services/shopProduct';
import { companyService } from '@/services/company';
import { Spinner } from '@/components/ui';
import { SafeImage } from '@/components/SafeImage';
import { StoreIcon, PackageIcon, TagIcon, CurrencyDollarIcon, ArrowRightIcon, ExternalLinkIcon } from '@/components/Icons';
import type { ShopProduct, Company, PaginatedData } from '@/types';

export default function OwnerDashboardPage() {
    const { user } = useAuth();
    const companyId = user?.company_id;

    // Fetch Shop Details
    const { data: companyData, isLoading: companyLoading } = useQuery({
        queryKey: ['owner-company-detail', companyId],
        queryFn: async () => {
            if (!companyId) return null;
            const res = await companyService.show(companyId);
            return (res.data.data as Company) || null;
        },
        enabled: !!companyId,
    });

    // Fetch Shop Products
    const { data: productsData, isLoading: productsLoading } = useQuery({
        queryKey: ['owner-dashboard-products'],
        queryFn: async () => {
            const res = await shopProductService.list({ per_page: 100 });
            return res.data.data as PaginatedData<ShopProduct>;
        },
    });

    const shop = companyData;
    const products = productsData?.data || [];

    // Calculate store metrics
    const activeProducts = products.filter((p) => p.status === 1);
    const totalStock = products.reduce((acc, p) => acc + (p.stock ?? p.product?.stock ?? 0), 0);
    const totalInventoryValue = products.reduce((acc, p) => {
        const price = Number(p.effective_price ?? p.shop_price ?? p.custom_price ?? p.base_price ?? 0);
        const stock = p.stock ?? p.product?.stock ?? 0;
        return acc + price * stock;
    }, 0);
    const averagePrice = products.length > 0
        ? products.reduce((acc, p) => acc + Number(p.effective_price ?? p.shop_price ?? p.custom_price ?? p.base_price ?? 0), 0) / products.length
        : 0;

    const isLoading = companyLoading || productsLoading;

    if (isLoading) {
        return (
            <div className="py-20 flex justify-center">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Store Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-2 shrink-0 shadow-md overflow-hidden border border-white/20">
                            <SafeImage
                                src={shop?.logo}
                                alt={shop?.name || 'Shop Logo'}
                                fallbackType="shop"
                                className="w-full h-full object-cover rounded-xl"
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                    {shop?.name || 'My Store Dashboard'}
                                </h1>
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                                    Active Merchant
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-xl line-clamp-2">
                                {shop?.sort_description || shop?.description || 'Manage your active store listings, set exclusive pricing, and synchronize stock.'}
                            </p>
                        </div>
                    </div>

                    {companyId && (
                        <Link
                            to={`/shops/${companyId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-600/30 shrink-0"
                        >
                            <span>Live Storefront</span>
                            <ExternalLinkIcon className="w-3.5 h-3.5" />
                        </Link>
                    )}
                </div>
            </div>

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Active Listings
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900">{activeProducts.length}</span>
                            <span className="text-xs font-semibold text-slate-400">/ {products.length} total</span>
                        </div>
                        <Link
                            to="/owner/my-products"
                            className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                        >
                            <span>Manage Products</span>
                            <ArrowRightIcon className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                        <StoreIcon className="w-6 h-6 text-indigo-600" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Total Units in Stock
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900">{totalStock}</span>
                            <span className="text-xs font-medium text-slate-500">Units</span>
                        </div>
                        <span className="inline-block mt-3 text-xs text-slate-400">
                            Across all store items
                        </span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner">
                        <PackageIcon className="w-6 h-6 text-purple-600" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Average Price Point
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900">${averagePrice.toFixed(2)}</span>
                        </div>
                        <span className="inline-block mt-3 text-xs text-slate-400">
                            Per product listing
                        </span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                        <TagIcon className="w-6 h-6 text-emerald-600" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Estimated Valuation
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900">
                                ${totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        <span className="inline-block mt-3 text-xs text-slate-400">
                            Based on retail prices
                        </span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
                        <CurrencyDollarIcon className="w-6 h-6 text-amber-600" />
                    </div>
                </div>
            </div>

            {/* Quick Action Shortcuts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <Link
                    to="/owner/catalog"
                    className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-indigo-400 hover:shadow-md transition-all group"
                >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                        <PackageIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        Add from Master Catalog
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Select pre-approved products from the global catalog to add to your shop with one click.
                    </p>
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                        <span>Browse Catalog</span>
                        <ArrowRightIcon className="w-3.5 h-3.5" />
                    </div>
                </Link>

                <Link
                    to="/owner/my-products"
                    className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-purple-400 hover:shadow-md transition-all group"
                >
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                        <TagIcon className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                        Adjust Retail Pricing
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Customize marketing descriptions, update discount prices, and manage active visibility.
                    </p>
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-purple-600">
                        <span>Edit Listings</span>
                        <ArrowRightIcon className="w-3.5 h-3.5" />
                    </div>
                </Link>

                <Link
                    to="/owner/create-product"
                    className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-emerald-400 hover:shadow-md transition-all group"
                >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                        <StoreIcon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                        Create Custom Product
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Upload custom photos, enter unique SKU specifications, and publish new products.
                    </p>
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                        <span>Create Product</span>
                        <ArrowRightIcon className="w-3.5 h-3.5" />
                    </div>
                </Link>
            </div>

            {/* Assigned Products Breakdown Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Current Store Listings</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Products actively assigned to your storefront with customized pricing.
                        </p>
                    </div>
                    <Link
                        to="/owner/my-products"
                        className="inline-flex items-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-2xs"
                    >
                        View Full Inventory
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3.5">Product</th>
                                <th className="px-6 py-3.5">SKU</th>
                                <th className="px-6 py-3.5">Your Shop Price</th>
                                <th className="px-6 py-3.5">Catalog Base</th>
                                <th className="px-6 py-3.5">Master Stock</th>
                                <th className="px-6 py-3.5">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-700">
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                                        No products assigned yet. Use the{' '}
                                        <Link to="/owner/catalog" className="text-indigo-600 font-bold underline">
                                            Shared Catalog
                                        </Link>{' '}
                                        to add items to your store!
                                    </td>
                                </tr>
                            ) : (
                                products.slice(0, 8).map((item) => {
                                    const effectivePrice = Number(
                                        item.effective_price ?? item.shop_price ?? item.custom_price ?? item.base_price ?? 0
                                    );
                                    const overridePrice = item.shop_price ?? item.custom_price;
                                    const isDiscounted =
                                        overridePrice !== null &&
                                        overridePrice !== undefined &&
                                        Number(overridePrice) < Number(item.base_price);

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 p-0.5">
                                                        <SafeImage
                                                            src={item.thumbnail || item.product?.photo}
                                                            alt={item.name}
                                                            fallbackType="product"
                                                            className="w-full h-full object-contain"
                                                        />
                                                    </div>
                                                    <span className="font-semibold text-xs text-slate-900 line-clamp-1 max-w-xs">
                                                        {item.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                                {item.sku}
                                            </td>
                                            <td className="px-6 py-4 font-black text-xs text-slate-900">
                                                ${effectivePrice.toFixed(2)}
                                                {isDiscounted && (
                                                    <span className="ml-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                                                        Sale
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-400">
                                                ${Number(item.base_price).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-slate-700">
                                                {item.stock ?? item.product?.stock ?? 0} units
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                        item.status === 1
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            : 'bg-slate-100 text-slate-500'
                                                    }`}
                                                >
                                                    {item.status === 1 ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
