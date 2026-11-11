import http from './http';
import type { ApiResponse } from '@/types';

export type UploadDirectory =
    | 'uploads/companies/logos'
    | 'uploads/products'
    | 'uploads/shop_products'
    | 'uploads/users';

// 384 KiB binary slice -> ~512 KiB JSON base64 payload, safely under 1 MB proxy/PHP limits
const CHUNK_SIZE_BYTES = 384 * 1024;

function generateUploadId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function readBlobAsBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === 'string' ? reader.result : '';
            const commaIdx = result.indexOf(',');
            resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
        };
        reader.onerror = () => reject(new Error('Failed to read selected image file.'));
        reader.readAsDataURL(blob);
    });
}

export async function uploadImageChunked(
    file: File,
    directory: UploadDirectory,
    onProgress?: (percent: number) => void
): Promise<string> {
    const uploadId = generateUploadId();
    const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE_BYTES));

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE_BYTES;
        const end = Math.min(file.size, start + CHUNK_SIZE_BYTES);
        const slice = file.slice(start, end);
        const base64Data = await readBlobAsBase64(slice);

        const res = await http.post<
            ApiResponse<{ completed: boolean; path?: string; url?: string }>
        >('/upload/chunk', {
            upload_id: uploadId,
            chunk_index: chunkIndex,
            total_chunks: totalChunks,
            filename: file.name || 'image.png',
            directory,
            data: base64Data,
        });

        onProgress?.(Math.round(((chunkIndex + 1) / totalChunks) * 100));

        if (chunkIndex === totalChunks - 1) {
            const storedPath = res.data?.data?.path;
            if (!storedPath) {
                throw new Error('Server did not return uploaded image path.');
            }
            return storedPath;
        }
    }

    throw new Error('Image upload did not complete.');
}
