import { useEffect, useState } from 'react';

interface SafeImageProps {
    src?: string | null;
    alt: string;
    className?: string;
    fallbackType?: 'shop' | 'product' | 'user';
}

export function SafeImage({
    src,
    alt,
    className = 'w-full h-full object-cover',
    fallbackType = 'product',
}: SafeImageProps) {
    const [hasError, setHasError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setHasError(false);
        setIsLoaded(false);
    }, [src]);

    const showFallback = !src || hasError;

    if (showFallback) {
        if (fallbackType === 'user') {
            const initial = (alt || 'U').trim().charAt(0).toUpperCase();
            return (
                <div className="w-full h-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black select-none">
                    <span>{initial}</span>
                </div>
            );
        }

        if (fallbackType === 'shop') {
            return (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-800 flex items-center justify-center p-4 text-white select-none">
                    <div className="text-center">
                        <div className="w-12 h-12 mx-auto rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white mb-2 shadow-inner">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <span className="text-xs font-bold tracking-wider uppercase opacity-90 block truncate max-w-[140px]">
                            {alt || 'Storefront'}
                        </span>
                    </div>
                </div>
            );
        }

        return (
            <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4 text-slate-400 select-none">
                <div className="text-center">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-white shadow-xs flex items-center justify-center text-slate-400 mb-1.5">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 block truncate max-w-[130px]">
                        {alt || 'Product'}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full overflow-hidden">
            {!isLoaded && (
                <div className="absolute inset-0 bg-slate-100 animate-pulse" />
            )}
            <img
                src={src}
                alt={alt}
                loading="lazy"
                onLoad={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
                className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
        </div>
    );
}
