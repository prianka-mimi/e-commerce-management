import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { orderService } from '@/services/order';
import { getApiErrorMessage } from '@/services/http';
import { Spinner, Alert, Badge, Modal, Pagination } from '@/components/ui';
import { SearchIcon, PackageIcon } from '@/components/Icons';
import type { PaginatedData } from '@/types';

interface OrderLineItem {
    id: number;
    product_id: number;
    shop_product_id?: number;
    product_name: string;
    quantity: number;
    price: number;
    total: number;
}

interface OrderRecord {
    id: number;
    trx_id: string;
    company_id: number;
    shop_name?: string | null;
    total_amount: number;
    payment_method: number;
    payment_method_name?: string;
    discount: number;
    note?: string | null;
    status: number;
    status_text: string;
    customer?: {
        id: number;
        name?: string;
        email?: string;
        phone?: string;
        address?: string;
    } | null;
    items?: OrderLineItem[];
    created_at?: string;
}

const ORDER_STATUS_OPTIONS = [
    { value: 1, label: 'Completed' },
    { value: 3, label: 'Pending' },
    { value: 4, label: 'Confirmed' },
    { value: 5, label: 'Processing' },
    { value: 6, label: 'On Hold' },
    { value: 7, label: 'Cancelled' },
    { value: 2, label: 'Refunded' },
];

export default function OrdersPage() {
    const queryClient = useQueryClient();
    const { hasRole } = useAuth();
    const { showToast } = useToast();
    const isAdmin = hasRole('Admin');

    const [page, setPage] = useState(1);
    const [trxSearch, setTrxSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [viewingOrder, setViewingOrder] = useState<OrderRecord | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<number>(1);
    const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    useEffect(() => {
        setPage(1);
    }, [trxSearch, statusFilter]);

    const { data, isLoading, error } = useQuery({
        queryKey: ['portal-orders', isAdmin ? 'admin' : 'owner', page, trxSearch, statusFilter],
        queryFn: async () => {
            const res = await orderService.list({
                page,
                per_page: 20,
                trx_id: trxSearch || undefined,
                status: statusFilter || undefined,
            });
            return res.data.data as unknown as PaginatedData<OrderRecord>;
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ orderId, status }: { orderId: number; status: number }) =>
            orderService.updateStatus(orderId, status),
        onSuccess: (res) => {
            setActionError(null);
            const updated = res.data.data as unknown as OrderRecord;
            if (updated) {
                setViewingOrder(updated);
                setSelectedStatus(updated.status);
            }
            const msg = 'Order status updated successfully.';
            setStatusFeedback(msg);
            showToast(msg, 'success');
            queryClient.invalidateQueries({ queryKey: ['portal-orders'] });
            queryClient.invalidateQueries({ queryKey: ['admin-all-orders'] });
            queryClient.invalidateQueries({ queryKey: ['admin-overview-metrics'] });
        },
        onError: (err: unknown) => {
            const msg = getApiErrorMessage(err, 'Failed to update order status.');
            setActionError(msg);
            showToast(msg, 'error');
        },
    });

    function openOrderModal(order: OrderRecord) {
        setStatusFeedback(null);
        setActionError(null);
        setViewingOrder(order);
        setSelectedStatus(order.status);
    }

    const orders = data?.data || [];
    const meta = data?.meta;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {isAdmin ? 'All Platform Orders' : 'Shop Orders'}
                    </h1>
                    <p className="text-sm text-slate-500">
                        {isAdmin
                            ? 'Monitor customer orders, payment methods, line items, and fulfillment statuses across all shops.'
                            : 'View customer orders placed for your shop and update fulfillment status.'}
                    </p>
                </div>
            </div>

            {/* Search & Status Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
                        <SearchIcon className="w-4 h-4" />
                    </span>
                    <input
                        type="text"
                        placeholder="Search by Transaction ID (e.g. ORD-...)..."
                        value={trxSearch}
                        onChange={(e) => setTrxSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700"
                >
                    <option value="">All Statuses</option>
                    {ORDER_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={String(opt.value)}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            {error && <Alert type="error" message="Failed to load orders list." />}

            {isLoading ? (
                <Spinner />
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3.5">Trx ID</th>
                                {isAdmin && <th className="px-6 py-3.5">Store</th>}
                                <th className="px-6 py-3.5">Customer</th>
                                <th className="px-6 py-3.5">Items</th>
                                <th className="px-6 py-3.5">Total</th>
                                <th className="px-6 py-3.5">Payment</th>
                                <th className="px-6 py-3.5">Status</th>
                                <th className="px-6 py-3.5">Date</th>
                                <th className="px-6 py-3.5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-700">
                            {orders.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={isAdmin ? 9 : 8}
                                        className="px-6 py-12 text-center text-slate-400"
                                    >
                                        No orders match your current filters.
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => {
                                    const itemCount =
                                        order.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

                                    return (
                                        <tr
                                            key={order.id}
                                            onClick={() => openOrderModal(order)}
                                            className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4 font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                                                {order.trx_id || `#${order.id}`}
                                            </td>
                                            {isAdmin && (
                                                <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                                                    {order.shop_name || `Shop #${order.company_id}`}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-xs">
                                                <span className="font-semibold text-slate-900 block">
                                                    {order.customer?.name || 'Customer'}
                                                </span>
                                                <span className="text-slate-400 font-mono text-[11px]">
                                                    {order.customer?.phone || order.customer?.email || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                                                    <PackageIcon className="w-3.5 h-3.5 text-slate-500" />
                                                    <span>{itemCount}</span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-900 text-xs whitespace-nowrap">
                                                ${Number(order.total_amount).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-600 whitespace-nowrap">
                                                {order.payment_method_name || 'Cash on Delivery'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge
                                                    status={order.status === 1 || order.status === 4 ? 1 : 2}
                                                    text={order.status_text}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap">
                                                {order.created_at || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openOrderModal(order);
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white text-xs font-bold transition-colors"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {meta && meta.total > 20 && meta.last_page > 1 && (
                <Pagination
                    currentPage={meta.current_page}
                    lastPage={meta.last_page}
                    total={meta.total}
                    onPageChange={(p) => setPage(p)}
                />
            )}

            {/* SINGLE ORDER DETAIL MODAL */}
            <Modal
                isOpen={!!viewingOrder}
                onClose={() => setViewingOrder(null)}
                title={`Order #${viewingOrder?.trx_id || viewingOrder?.id || ''}`}
                size="2xl"
            >
                {viewingOrder && (
                    <div className="space-y-5 text-xs text-slate-600">
                        {actionError && <Alert type="error" message={actionError} />}
                        {statusFeedback && <Alert type="success" message={statusFeedback} />}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <div>
                                <span className="font-semibold text-slate-400 uppercase text-[10px] block">
                                    Storefront
                                </span>
                                <span className="text-sm font-bold text-slate-900 block mt-0.5">
                                    {viewingOrder.shop_name || `Shop #${viewingOrder.company_id}`}
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
                                    {viewingOrder.customer?.name || 'Customer'}
                                </span>
                                <span className="text-slate-500 font-mono text-[11px] block">
                                    {viewingOrder.customer?.phone || ''}
                                    {viewingOrder.customer?.email ? ` | ${viewingOrder.customer.email}` : ''}
                                </span>
                                {viewingOrder.customer?.address && (
                                    <span className="text-slate-500 text-[11px] block mt-0.5">
                                        {viewingOrder.customer.address}
                                    </span>
                                )}
                            </div>
                            <div>
                                <span className="font-semibold text-slate-400 uppercase text-[10px] block">
                                    Payment & Date
                                </span>
                                <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                                    {viewingOrder.payment_method_name || 'Cash on Delivery'}
                                </span>
                                <span className="text-slate-400 text-[11px] block mt-0.5">
                                    {viewingOrder.created_at || '-'}
                                </span>
                            </div>
                        </div>

                        {viewingOrder.note && (
                            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900">
                                <span className="font-bold block text-[10px] uppercase tracking-wider text-amber-700 mb-0.5">
                                    Customer Note
                                </span>
                                {viewingOrder.note}
                            </div>
                        )}

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
                                            <th className="px-4 py-2 text-right">Unit Price</th>
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

                        {/* Update Order Status */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-slate-700">
                                    Update Status:
                                </label>
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(Number(e.target.value))}
                                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {ORDER_STATUS_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    disabled={
                                        updateStatusMutation.isPending ||
                                        selectedStatus === viewingOrder.status
                                    }
                                    onClick={() =>
                                        updateStatusMutation.mutate({
                                            orderId: viewingOrder.id,
                                            status: selectedStatus,
                                        })
                                    }
                                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs disabled:opacity-50 transition-colors"
                                >
                                    {updateStatusMutation.isPending ? 'Updating...' : 'Save Status'}
                                </button>
                            </div>

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
