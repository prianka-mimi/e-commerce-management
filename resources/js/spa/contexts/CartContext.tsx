import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useToast } from '@/contexts/ToastContext';

export interface CartItem {
    shopProductId: number;
    productId: number;
    companyId: number;
    companyName: string;
    name: string;
    price: number;
    thumbnail?: string;
    sku?: string;
    maxStock?: number;
    quantity: number;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
    updateQuantity: (shopProductId: number, quantity: number) => void;
    removeFromCart: (shopProductId: number) => void;
    clearCart: () => void;
    isInCart: (shopProductId: number) => boolean;
    totalCount: number;
    totalAmount: number;
    isCartOpen: boolean;
    setIsCartOpen: (open: boolean) => void;
    lastAddedItem: CartItem | null;
}

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = 'shop_marketplace_cart';

export function CartProvider({ children }: { children: ReactNode }) {
    const { showToast } = useToast();
    const [items, setItems] = useState<CartItem[]>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    const [isCartOpen, setIsCartOpen] = useState(false);
    const [lastAddedItem, setLastAddedItem] = useState<CartItem | null>(null);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch (e) {
            console.error('Failed to persist cart items to localStorage', e);
        }
    }, [items]);

    function isInCart(shopProductId: number): boolean {
        return items.some((i) => i.shopProductId === shopProductId);
    }

    function addToCart(item: Omit<CartItem, 'quantity'>, quantity = 1) {
        setItems((prev) => {
            const existingIndex = prev.findIndex((i) => i.shopProductId === item.shopProductId);
            if (existingIndex > -1) {
                const updated = [...prev];
                const nextQty = updated[existingIndex].quantity + quantity;
                const cap = item.maxStock ?? updated[existingIndex].maxStock;
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    maxStock: cap,
                    quantity: typeof cap === 'number' && cap > 0 ? Math.min(cap, nextQty) : nextQty,
                };
                setLastAddedItem(updated[existingIndex]);
                return updated;
            }
            const safeQty =
                typeof item.maxStock === 'number' && item.maxStock > 0
                    ? Math.min(item.maxStock, quantity)
                    : quantity;
            const newItem: CartItem = { ...item, quantity: safeQty };
            setLastAddedItem(newItem);
            return [...prev, newItem];
        });

        showToast(`"${item.name}" added to cart!`, 'success');
    }

    function updateQuantity(shopProductId: number, quantity: number) {
        if (quantity <= 0) {
            removeFromCart(shopProductId);
            return;
        }
        setItems((prev) =>
            prev.map((i) => {
                if (i.shopProductId !== shopProductId) return i;
                const cappedQty =
                    typeof i.maxStock === 'number' && i.maxStock > 0
                        ? Math.min(i.maxStock, quantity)
                        : quantity;
                return { ...i, quantity: cappedQty };
            })
        );
    }

    function removeFromCart(shopProductId: number) {
        setItems((prev) => prev.filter((i) => i.shopProductId !== shopProductId));
        showToast('Item removed from cart.', 'info');
    }

    function clearCart() {
        setItems([]);
        localStorage.removeItem(STORAGE_KEY);
    }

    const totalCount = items.reduce((acc, item) => acc + item.quantity, 0);
    const totalAmount = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

    return (
        <CartContext.Provider
            value={{
                items,
                addToCart,
                updateQuantity,
                removeFromCart,
                clearCart,
                isInCart,
                totalCount,
                totalAmount,
                isCartOpen,
                setIsCartOpen,
                lastAddedItem,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart(): CartContextType {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within CartProvider');
    return ctx;
}
