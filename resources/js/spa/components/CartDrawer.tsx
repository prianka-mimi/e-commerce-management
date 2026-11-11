import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { SafeImage } from '@/components/SafeImage';
import { CheckoutModal } from '@/components/CheckoutModal';
import {
    BagIcon,
    CartIcon,
    StoreIcon,
    PlusIcon,
    MinusIcon,
    TrashIcon,
    XIcon,
    ArrowRightIcon,
} from '@/components/Icons';

export function CartDrawer() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const {
        items,
        isCartOpen,
        setIsCartOpen,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalCount,
        totalAmount,
    } = useCart();

    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    function handleOpenCheckout() {
        if (!isAuthenticated) {
            setIsCartOpen(false);
            navigate('/login?redirect=checkout');
            return;
        }
        setIsCartOpen(false);
        setIsCheckoutOpen(true);
    }

    return (
        <>
            {isCartOpen &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div className="fixed inset-0 z-40 m-0 overflow-hidden">
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
                            onClick={() => {
                                setIsCartOpen(false);
                            }}
                        />

                <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                    <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
                        {/* Drawer Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2.5">
                                <BagIcon className="w-5 h-5 text-indigo-600" />
                                <h2 className="text-lg font-bold text-slate-900">
                                    Your Shopping Cart
                                </h2>
                                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                                    {totalCount}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCartOpen(false);
                                }}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Items List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {items.length === 0 ? (
                                <div className="text-center py-20 space-y-4">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                                        <CartIcon className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">Your cart is empty</h3>
                                        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                                            Explore our verified merchant storefronts to discover custom priced gear.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsCartOpen(false)}
                                        className="inline-flex px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-indigo-600 transition-colors"
                                    >
                                        Browse Products
                                    </button>
                                </div>
                            ) : (
                                items.map((item) => (
                                    <div
                                        key={item.shopProductId}
                                        className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex gap-3.5 items-start"
                                    >
                                        <div className="w-16 h-16 rounded-xl bg-slate-50 p-1.5 border border-slate-100 shrink-0 overflow-hidden">
                                            <SafeImage
                                                src={item.thumbnail}
                                                alt={item.name}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                                                {item.name}
                                            </h4>
                                            <p className="text-[10px] text-indigo-600 font-semibold mt-0.5 flex items-center gap-1">
                                                <StoreIcon className="w-3 h-3 text-indigo-500 shrink-0" />
                                                <span>{item.companyName}</span>
                                            </p>
                                            <p className="text-xs font-black text-slate-900 mt-1">
                                                ${item.price.toFixed(2)}
                                            </p>

                                            {/* Quantity Adjuster */}
                                            <div className="mt-2 flex items-center justify-between">
                                                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateQuantity(item.shopProductId, item.quantity - 1)
                                                        }
                                                        className="w-6 h-6 rounded-md bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shadow-2xs"
                                                    >
                                                        <MinusIcon className="w-3 h-3" />
                                                    </button>
                                                    <span className="w-7 text-center font-bold text-xs text-slate-800">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        disabled={typeof item.maxStock === 'number' && item.quantity >= item.maxStock}
                                                        onClick={() =>
                                                            updateQuantity(item.shopProductId, item.quantity + 1)
                                                        }
                                                        className="w-6 h-6 rounded-md bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shadow-2xs disabled:opacity-40"
                                                    >
                                                        <PlusIcon className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => removeFromCart(item.shopProductId)}
                                                    className="text-xs text-slate-400 hover:text-rose-600 font-medium transition-colors flex items-center gap-1"
                                                >
                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                    <span>Remove</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Drawer Footer */}
                        {items.length > 0 && (
                            <div className="p-6 border-t border-slate-100 bg-slate-50/70 space-y-4">
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between text-slate-500">
                                        <span>Items Subtotal:</span>
                                        <span className="font-semibold text-slate-700">
                                            ${totalAmount.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                        <span>Merchant Dispatch:</span>
                                        <span className="font-bold text-emerald-600">FREE</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                                        <span>Total:</span>
                                        <span className="text-xl font-black text-indigo-600">
                                            ${totalAmount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <button
                                        type="button"
                                        onClick={handleOpenCheckout}
                                        className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2"
                                    >
                                        <span>Proceed to Checkout</span>
                                        <ArrowRightIcon className="w-4 h-4 text-white" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearCart}
                                        className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors text-center"
                                    >
                                        Clear Cart
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>,
            document.body
            )}

            {/* Checkout Modal when triggered */}
            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
            />
        </>
    );
}
