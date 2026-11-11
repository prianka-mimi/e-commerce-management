import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/Icons';

export function Spinner({ className = '' }: { className?: string }) {
    return (
        <div className={`flex justify-center items-center py-12 ${className}`}>
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );
}

export function Alert({
    type = 'error',
    message,
}: {
    type?: 'error' | 'success' | 'warning';
    message: string;
}) {
    const colors = {
        error: 'bg-red-50 text-red-700 border-red-200',
        success: 'bg-green-50 text-green-700 border-green-200',
        warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    };
    return (
        <div className={`border rounded-xl px-4 py-3 text-sm ${colors[type]}`}>
            {message}
        </div>
    );
}

export function Badge({
    active,
    status,
    text,
    activeLabel = 'Active',
    inactiveLabel = 'Inactive',
}: {
    active?: boolean;
    status?: number;
    text?: string;
    activeLabel?: string;
    inactiveLabel?: string;
}) {
    const isAct = active !== undefined ? active : status === 1;
    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isAct
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
        >
            {text || (isAct ? activeLabel : inactiveLabel)}
        </span>
    );
}

export function Pagination({
    currentPage,
    lastPage,
    total,
    onPageChange,
}: {
    currentPage: number;
    lastPage: number;
    total?: number;
    onPageChange: (page: number) => void;
}) {
    if (total !== undefined && total <= 20) return null;
    if (lastPage <= 1) return null;
    return (
        <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-slate-500">
                Page <span className="font-bold text-slate-700">{currentPage}</span> of{' '}
                <span className="font-bold text-slate-700">{lastPage}</span>
            </p>
            <div className="flex gap-2">
                <button
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                    <ChevronLeftIcon className="w-3.5 h-3.5" />
                    <span>Previous</span>
                </button>
                <button
                    disabled={currentPage === lastPage}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                    <span>Next</span>
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

export function ConfirmDialog({
    isOpen,
    open,
    title,
    message,
    confirmText = 'Delete',
    onConfirm,
    onCancel,
    loading,
}: {
    isOpen?: boolean;
    open?: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
}) {
    const isVis = isOpen !== undefined ? isOpen : !!open;

    useEffect(() => {
        if (!isVis) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isVis, onCancel]);

    if (!isVis || typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-50 m-0 flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
                onClick={onCancel}
            />
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm border border-slate-100"
            >
                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">{message}</p>
                <div className="mt-5 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}


export function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = '2xl',
}: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
}) {
    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || typeof document === 'undefined') return null;

    const sizeClasses: Record<string, string> = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        full: 'max-w-6xl',
    };

    return createPortal(
        <div className="fixed inset-0 z-50 m-0 overflow-y-auto p-4 sm:p-6">
            <div
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div
                className="relative flex min-h-full items-center justify-center"
                onClick={onClose}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className={`relative flex flex-col max-h-[90vh] w-full ${sizeClasses[size] || 'max-w-2xl'} overflow-hidden rounded-3xl bg-white text-left shadow-2xl border border-slate-200 transition-all`}
                >
                    <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-slate-200 shrink-0 bg-white">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">
                            {title}
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 custom-scrollbar">
                        {children}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
