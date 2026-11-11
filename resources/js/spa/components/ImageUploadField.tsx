import { useEffect, useRef, useState } from 'react';
import { SafeImage } from '@/components/SafeImage';
import { XIcon } from '@/components/Icons';

interface ImageUploadFieldProps {
    label: string;
    file: File | null;
    onChange: (file: File | null) => void;
    currentImageUrl?: string | null;
    fallbackType?: 'product' | 'shop' | 'user';
    helperText?: string;
    progress?: number | null;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ImageUploadField({
    label,
    file,
    onChange,
    currentImageUrl,
    fallbackType = 'product',
    helperText,
    progress,
}: ImageUploadFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!file) {
            setObjectUrl(null);
            return;
        }

        const url = URL.createObjectURL(file);
        setObjectUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [file]);

    const previewSrc = objectUrl || currentImageUrl || null;

    function handleClear() {
        onChange(null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    }

    return (
        <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
                {label}
            </label>

            <div className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 bg-slate-50/70">
                <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
                    {objectUrl ? (
                        <img
                            src={objectUrl}
                            alt="Selected preview"
                            className="w-full h-full object-contain rounded-lg"
                        />
                    ) : previewSrc || fallbackType !== 'user' ? (
                        <SafeImage
                            src={previewSrc}
                            alt={label}
                            fallbackType={fallbackType}
                            className="w-full h-full object-contain rounded-lg"
                        />
                    ) : (
                        <span className="text-[11px] font-medium text-slate-400 text-center px-1">
                            No Image
                        </span>
                    )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => onChange(e.target.files?.[0] || null)}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                    />

                    {file ? (
                        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
                            <span className="truncate font-medium">
                                {file.name} ({formatBytes(file.size)})
                            </span>
                            <button
                                type="button"
                                onClick={handleClear}
                                className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold shrink-0"
                            >
                                <XIcon className="w-3 h-3" />
                                <span>Clear</span>
                            </button>
                        </div>
                    ) : helperText ? (
                        <p className="text-[11px] text-slate-400">{helperText}</p>
                    ) : currentImageUrl ? (
                        <p className="text-[11px] text-slate-400">
                            Showing current image. Choose a new file to preview and replace.
                        </p>
                    ) : null}

                    {typeof progress === 'number' && progress > 0 && progress < 100 && (
                        <div className="space-y-1 pt-0.5">
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-600 transition-all duration-150"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <span className="block text-[10px] font-semibold text-indigo-600">
                                Uploading image: {progress}%
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
