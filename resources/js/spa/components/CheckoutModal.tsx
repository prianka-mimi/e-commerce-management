import { useState, useEffect, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { customerService } from '@/services/customer';
import { getApiErrorMessage } from '@/services/http';
import { SafeImage } from '@/components/SafeImage';
import { Alert } from '@/components/ui';
import { CartIcon, CashIcon, CreditCardIcon, CheckIcon, ArrowRightIcon } from '@/components/Icons';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { items, totalAmount, clearCart } = useCart();
    const { showToast } = useToast();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [note, setNote] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card'>('cod');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmedOrder, setConfirmedOrder] = useState<{
        trx_id: string;
        total_amount: number;
        customer_name: string;
        shop_name?: string;
        payment_method_name?: string;
    } | null>(null);

    useEffect(() => {
        if (!isOpen || !user) return;
        setName((prev) => prev || user.name || '');
        setEmail((prev) => prev || user.email || '');
        setPhone((prev) => prev || user.phone || '');
    }, [isOpen, user]);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (confirmedOrder) {
                    setConfirmedOrder(null);
                }
                onClose();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isOpen, confirmedOrder, onClose]);

    if (!isOpen || typeof document === 'undefined') return null;

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const payload = {
                name,
                email,
                phone,
                address,
                note: note || undefined,
                payment_method: paymentMethod,
                items: items.map((i) => ({
                    shop_product_id: i.shopProductId,
                    quantity: i.quantity,
                })),
            };

            const res = await customerService.checkout(payload);
            const orderData = res.data.data as {
                trx_id?: string;
                total_amount?: number;
                customer_name?: string;
                shop_name?: string;
                payment_method_name?: string;
            } | null;

            setConfirmedOrder({
                trx_id: orderData?.trx_id || 'TRX-CONFIRMED',
                total_amount: Number(orderData?.total_amount ?? totalAmount),
                customer_name: orderData?.customer_name || name,
                shop_name: orderData?.shop_name || 'Verified Store',
                payment_method_name:
                    orderData?.payment_method_name ||
                    (paymentMethod === 'card' ? 'Card (Paid)' : 'Cash on Delivery'),
            });

            clearCart();
            showToast('Order placed successfully!', 'success');

            // Immediately refresh live stock & order metrics across storefront, owner, and admin caches
            const keysToInvalidate = [
                'customer-shop-product-detail',
                'customer-shop-products',
                'customer-featured-products-home',
                'customer-all-products',
                'customer-shops-slider',
                'customer-shops-filter-list',
                'owner-dashboard-products',
                'owner-shop-products',
                'owner-catalog',
                'admin-products',
                'admin-overview-metrics',
                'portal-orders',
            ];
            keysToInvalidate.forEach((key) => {
                queryClient.invalidateQueries({ queryKey: [key] });
            });
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err, 'Failed to place order. Please check all required fields.');
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleFinish() {
        setConfirmedOrder(null);
        onClose();
    }

    return createPortal(
        <div className="fixed inset-0 z-50 m-0 overflow-y-auto p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={confirmedOrder ? handleFinish : onClose}
            />

            <div
                className="relative flex min-h-full items-center justify-center"
                onClick={confirmedOrder ? handleFinish : onClose}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="relative flex flex-col max-h-[90vh] overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all w-full max-w-2xl border border-slate-100"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-slate-50/50 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                                <CartIcon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    {confirmedOrder ? 'Order Confirmed!' : 'Checkout & Purchase'}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {confirmedOrder
                                        ? 'Thank you for supporting verified independent merchants.'
                                        : 'Complete your direct merchant purchase in just one step.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {confirmedOrder ? (
                        /* Confirmation Screen */
                        <div className="p-8 text-center space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                                <CheckIcon className="w-8 h-8 text-emerald-600" />
                            </div>
                            <div>
                                <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
                                    Purchase Successful
                                </span>
                                <h4 className="text-2xl font-black text-slate-900">
                                    Invoice Reference: {confirmedOrder.trx_id}
                                </h4>
                                <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
                                    Hello <strong className="text-slate-800">{confirmedOrder.customer_name}</strong>,
                                    your order of{' '}
                                    <strong className="text-indigo-600 font-bold">
                                        ${Number(confirmedOrder.total_amount).toFixed(2)}
                                    </strong>{' '}
                                    has been transmitted directly to the merchant dispatch team.
                                </p>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 text-left text-xs space-y-2 max-w-md mx-auto">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Order Reference:</span>
                                    <span className="font-mono font-bold text-slate-800">
                                        {confirmedOrder.trx_id}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Merchant Store:</span>
                                    <span className="font-semibold text-slate-800">
                                        {confirmedOrder.shop_name || 'Verified Merchant Store'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Payment Method:</span>
                                    <span className="font-bold text-emerald-600">
                                        {confirmedOrder.payment_method_name || 'Confirmed'}
                                    </span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleFinish}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-sm transition-all shadow-md"
                            >
                                <span>Continue Shopping</span>
                                <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        /* Checkout Form */
                        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                            {error && <Alert type="error" message={error} />}

                            {/* Cart Items Summary */}
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                                    Items in Your Purchase ({items.length})
                                </span>
                                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                                    {items.map((item) => (
                                        <div
                                            key={item.shopProductId}
                                            className="flex items-center justify-between gap-3 text-xs"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-10 h-10 rounded-lg bg-white p-1 border border-slate-200 shrink-0">
                                                    <SafeImage
                                                        src={item.thumbnail}
                                                        alt={item.name}
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                                <div className="truncate">
                                                    <p className="font-semibold text-slate-800 truncate">
                                                        {item.name}
                                                    </p>
                                                    <p className="text-[10px] text-indigo-600">
                                                        {item.companyName} x {item.quantity}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="font-bold text-slate-900 shrink-0">
                                                ${(item.price * item.quantity).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-sm">
                                    <span className="font-bold text-slate-700">Total Purchase Amount:</span>
                                    <span className="text-xl font-black text-indigo-600">
                                        ${totalAmount.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Contact & Shipping Details */}
                            <div className="space-y-4">
                                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Customer & Delivery Details
                                </span>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Your Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="John Doe"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Email Address *
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="john@example.com"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Phone Number *
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="01700000000"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Payment Method
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('cod')}
                                                className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all flex items-center justify-center gap-1.5 ${
                                                    paymentMethod === 'cod'
                                                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                <CashIcon className="w-4 h-4 text-emerald-600" />
                                                <span>Cash on Delivery</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('card')}
                                                className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all flex items-center justify-center gap-1.5 ${
                                                    paymentMethod === 'card'
                                                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                <CreditCardIcon className="w-4 h-4 text-indigo-600" />
                                                <span>Instant Card</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Delivery / Shipping Address *
                                    </label>
                                    <textarea
                                        rows={2}
                                        required
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="Full delivery street address, apartment / suite number, city..."
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Special Note / Instructions (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="e.g. Call upon arrival at building"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || items.length === 0}
                                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Processing Order...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Confirm & Place Order (${totalAmount.toFixed(2)})</span>
                                            <ArrowRightIcon className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
