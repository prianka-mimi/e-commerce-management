import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminService } from '@/services/admin';
import { Spinner, Alert, Badge, Modal } from '@/components/ui';
import {
    StoreIcon,
    PackageIcon,
    CartIcon,
    ArrowRightIcon,
    ExternalLinkIcon,
} from '@/components/Icons';

interface OrderLineItem {
    id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    price: number;
    total: number;
}

interface OrderItem {
    id: number;
    trx_id: string;
    shop_name: string;
    customer_name?: string;
    customer_email?: string | null;
    customer_phone?: string | null;
    customer?: {
        name?: string;
        email?: string;
        phone?: string;
    };
    total_amount: number;
    items_count?: number;
    items?: OrderLineItem[];
    status: number;
    status_text: string;
    created_at: string;
}

export default function AdminDashboardPage() {
    const [viewingOrder, setViewingOrder] = useState<OrderItem | null>(null);

    const { data: overviewRes, isLoading, error } = useQuery({
        queryKey: ['admin-overview-metrics'],
        queryFn: async () => {
            const res = await adminService.overview();
            return res.data.data;
        },
    });

    const metrics = overviewRes?.metrics;
    const latestOrders = overviewRes?.latest_orders || [];

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Platform Dashboard
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Overview of shops, sellers, buyers, products, catalog, and orders.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Multi-Store Network Active
                    </span>
                    <Link
                        to="/"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-medium text-xs transition-colors shadow-2xs flex items-center gap-1.5"
                    >
                        <span>Storefront</span>
                        <ExternalLinkIcon className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>

            {isLoading && <Spinner />}

            {error && (
                <Alert
                    type="error"
                    message="Failed to load dashboard metrics. Please ensure you are authenticated."
                />
            )}

            {metrics && (
                <>
                    {/* 5 KPI Overview Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {/* Card 1: Total Shops */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Total Shops
                                </span>
                                <div className="mt-2 text-3xl font-black text-slate-900">
                                    {metrics.total_shops}
                                </div>
                                <Link
                                    to="/admin/shops"
                                    className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                                >
                                    <span>Manage Shops</span>
                                    <ArrowRightIcon className="w-3 h-3" />
                                </Link>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                                <StoreIcon className="w-6 h-6 text-indigo-600" />
                            </div>
                        </div>

                        {/* Card 2: Total Sellers */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Total Sellers
                                </span>
                                <div className="mt-2 text-3xl font-black text-slate-900">
                                    {metrics.total_sellers}
                                </div>
                                <Link
                                    to="/admin/users"
                                    className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                                >
                                    <span>View Shop Owners</span>
                                    <ArrowRightIcon className="w-3 h-3" />
                                </Link>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shadow-inner">
                                <StoreIcon className="w-6 h-6 text-violet-600" />
                            </div>
                        </div>

                        {/* Card 3: Total Buyers */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Total Buyers
                                </span>
                                <div className="mt-2 text-3xl font-black text-slate-900">
                                    {metrics.total_buyers}
                                </div>
                                <Link
                                    to="/admin/users"
                                    className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                                >
                                    <span>View Customers</span>
                                    <ArrowRightIcon className="w-3 h-3" />
                                </Link>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                                <CartIcon className="w-6 h-6 text-emerald-600" />
                            </div>
                        </div>

                        {/* Card 4: Total Products */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Total Products
                                </span>
                                <div className="mt-2 text-3xl font-black text-slate-900">
                                    {metrics.total_products}
                                </div>
                                <span className="inline-block mt-3 text-xs font-medium text-slate-500">
                                    Assigned across stores
                                </span>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
                                <PackageIcon className="w-6 h-6 text-amber-600" />
                            </div>
                        </div>

                        {/* Card 5: Total Catalog */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Total Catalog
                                </span>
                                <div className="mt-2 text-3xl font-black text-slate-900">
                                    {metrics.total_catalog}
                                </div>
                                <Link
                                    to="/admin/products"
                                    className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                                >
                                    <span>Global Master Catalog</span>
                                    <ArrowRightIcon className="w-3 h-3" />
                                </Link>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-inner">
                                <PackageIcon className="w-6 h-6 text-sky-600" />
                            </div>
                        </div>
                    </div>

                    {/* LATEST 6 ORDERS */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Latest Orders
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Most recent purchases across all verified storefronts.
                                </p>
                            </div>
                            <Link
                                to="/admin/orders"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-2xs"
                            >
                                <span>See All</span>
                                <ArrowRightIcon className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {latestOrders.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-sm">
                                No orders have been placed yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-3.5">Trx ID</th>
                                            <th className="px-6 py-3.5">Store</th>
                                            <th className="px-6 py-3.5">Customer</th>
                                            <th className="px-6 py-3.5">Amount</th>
                                            <th className="px-6 py-3.5">Status</th>
                                            <th className="px-6 py-3.5">Date</th>
                                            <th className="px-6 py-3.5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 text-slate-700">
                                        {latestOrders.map((order) => (
                                            <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-mono font-bold text-slate-900 text-xs">
                                                    {order.trx_id}
                                                </td>
                                                <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                                                    {order.shop_name}
                                                </td>
                                                <td className="px-6 py-4 text-xs">
                                                    <span className="font-semibold text-slate-800 block">
                                                        {order.customer_name}
                                                    </span>
                                                    <span className="text-slate-400 font-mono text-[11px]">
                                                        {order.customer_phone || order.customer_email || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-900 text-xs">
                                                    ${Number(order.total_amount).toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge
                                                        status={order.status === 1 ? 1 : 2}
                                                        text={order.status_text}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap">
                                                    {order.created_at}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingOrder(order)}
                                                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                    >
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* SINGLE ORDER VIEW MODAL */}
            <Modal
                isOpen={!!viewingOrder}
                onClose={() => setViewingOrder(null)}
                title={`Order #${viewingOrder?.trx_id || ''}`}
                size="lg"
            >
                {viewingOrder && (
                    <div className="space-y-4 text-xs text-slate-600">
                        <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <div>
                                <span className="font-semibold text-slate-400 uppercase text-[10px] block">
                                    Storefront
                                </span>
                                <span className="text-sm font-bold text-slate-900 block mt-0.5">
                                    {viewingOrder.shop_name}
                                </span>
                            </div>
                            <div>
                                <span className="font-semibold text-slate-400 uppercase text-[10px] block">
                                    Total Amount
                                </span>
                                <span className="text-sm font-black text-indigo-600 block mt-0.5">
                                    ${Number(viewingOrder.total_amount).toFixed(2)}
                                </span>
                            </div>
                            <div>
                                <span className="font-semibold text-slate-400 uppercase text-[10px] block">
                                    Customer
                                </span>
                                <span className="text-xs font-bold text-slate-800 block mt-0.5">
                                    {viewingOrder.customer?.name || viewingOrder.customer_name || 'Customer'}
                                </span>
                                <span className="text-slate-500 font-mono text-[11px]">
                                    {viewingOrder.customer?.phone || viewingOrder.customer_phone || ''}
                                </span>
                            </div>
                            <div>
                                <span className="font-semibold text-slate-400 uppercase text-[10px] block">
                                    Status
                                </span>
                                <div className="mt-1">
                                    <Badge
                                        status={viewingOrder.status === 1 ? 1 : 2}
                                        text={viewingOrder.status_text}
                                    />
                                </div>
                            </div>
                        </div>

                        {viewingOrder.items && viewingOrder.items.length > 0 && (
                            <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-bold text-[11px] uppercase tracking-wider text-slate-600">
                                    Ordered Products ({viewingOrder.items.length})
                                </div>
                                <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                                    <thead className="bg-slate-50/50 text-slate-500 font-semibold">
                                        <tr>
                                            <th className="px-4 py-2">Product</th>
                                            <th className="px-4 py-2 text-center">Qty</th>
                                            <th className="px-4 py-2 text-right">Price</th>
                                            <th className="px-4 py-2 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {viewingOrder.items.map((item) => (
                                            <tr key={item.id}>
                                                <td className="px-4 py-2 font-semibold text-slate-800">
                                                    {item.product_name}
                                                </td>
                                                <td className="px-4 py-2 text-center font-mono text-slate-600">
                                                    {item.quantity}
                                                </td>
                                                <td className="px-4 py-2 text-right text-slate-600">
                                                    ${Number(item.price).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-2 text-right font-bold text-slate-900">
                                                    ${Number(item.total).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setViewingOrder(null)}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
