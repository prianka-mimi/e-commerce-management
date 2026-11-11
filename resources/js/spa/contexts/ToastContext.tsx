import React, {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, XIcon } from '@/components/Icons';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType) => void;
    dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const nextIdRef = useRef(1);

    const dismissToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const showToast = useCallback(
        (message: string, type: ToastType = 'success') => {
            const id = nextIdRef.current++;
            setToasts((prev) => [...prev.slice(-3), { id, message, type }]);

            window.setTimeout(() => {
                setToasts((prev) => prev.filter((item) => item.id !== id));
            }, 4000);
        },
        [],
    );

    const getStyleClasses = (type: ToastType) => {
        if (type === 'error') {
            return {
                wrapper: 'bg-red-600 text-white border-red-500/40',
                iconBg: 'bg-red-700/60 text-white',
            };
        }
        if (type === 'info') {
            return {
                wrapper: 'bg-indigo-600 text-white border-indigo-500/40',
                iconBg: 'bg-indigo-700/60 text-white',
            };
        }
        return {
            wrapper: 'bg-slate-900 text-white border-slate-700/50',
            iconBg: 'bg-emerald-500/20 text-emerald-400',
        };
    };

    const overlay =
        toasts.length > 0 ? (
            <div
                aria-live="polite"
                className="fixed bottom-5 right-5 z-[70] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
            >
                {toasts.map((toast) => {
                    const styles = getStyleClasses(toast.type);
                    return (
                        <div
                            key={toast.id}
                            role="status"
                            className={`pointer-events-auto flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-xl border text-sm font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 ${styles.wrapper}`}
                        >
                            <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${styles.iconBg}`}
                            >
                                {toast.type === 'error' ? (
                                    <span className="text-xs font-black">!</span>
                                ) : (
                                    <CheckIcon className="w-4 h-4" />
                                )}
                            </div>
                            <span className="flex-1 leading-snug break-words">
                                {toast.message}
                            </span>
                            <button
                                type="button"
                                onClick={() => dismissToast(toast.id)}
                                className="p-1 rounded-lg opacity-75 hover:opacity-100 transition-opacity shrink-0"
                                aria-label="Dismiss notification"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        ) : null;

    return (
        <ToastContext.Provider value={{ showToast, dismissToast }}>
            {children}
            {typeof document !== 'undefined' && overlay
                ? createPortal(overlay, document.body)
                : null}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
