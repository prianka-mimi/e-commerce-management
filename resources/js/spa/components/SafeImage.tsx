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

        return (
            <div className="w-full h-full bg-white flex items-center justify-center overflow-hidden">
                <img
                    src="/img/default.png"
                    alt={alt || (fallbackType === 'shop' ? 'Default Shop Image' : 'Default Product Image')}
                    className="w-full h-full object-contain p-1"
                />
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
