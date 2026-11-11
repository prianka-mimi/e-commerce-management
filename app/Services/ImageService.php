<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

class ImageService
{
    public const ALLOWED_DIRECTORIES = [
        'uploads/companies/logos',
        'uploads/products',
        'uploads/shop_products',
        'uploads/users',
    ];

    protected string $disk = 'public';

    /**
     * Upload an image file to storage and return its relative path.
     */
    public function upload(UploadedFile $file, string $directory = 'uploads'): string
    {
        if (! $file->isValid()) {
            throw new InvalidArgumentException($file->getErrorMessage() ?: 'Uploaded image file is invalid.');
        }

        $directory = trim($directory, '/') ?: 'uploads';
        $extension = $file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'png';
        $fileName = Str::uuid().'.'.strtolower($extension);
        $path = $file->storeAs($directory, $fileName, $this->disk);

        if (! is_string($path) || $path === '') {
            throw new RuntimeException('Failed to store uploaded image file.');
        }

        return $path;
    }

    /**
     * Store a base64 chunk and stream-assemble into public storage on the final chunk.
     * Bypasses PHP upload_max_filesize / post_max_size limits for any image size.
     */
    public function storeChunk(
        string $uploadId,
        int $chunkIndex,
        int $totalChunks,
        string $filename,
        string $directory,
        string $base64Data
    ): array {
        $normalizedDir = trim(str_replace('\\', '/', $directory), '/');
        if (! in_array($normalizedDir, self::ALLOWED_DIRECTORIES, true)) {
            throw new InvalidArgumentException('Invalid upload destination directory.');
        }

        if ($chunkIndex < 0 || $totalChunks < 1 || $chunkIndex >= $totalChunks) {
            throw new InvalidArgumentException('Invalid upload chunk sequence.');
        }

        $binary = base64_decode($base64Data, true);
        if ($binary === false) {
            throw new InvalidArgumentException('Corrupted image chunk encoding.');
        }

        $chunkDir = storage_path('app/private/chunks/'.$uploadId);
        File::ensureDirectoryExists($chunkDir);

        $chunkPath = $chunkDir.'/part_'.$chunkIndex;
        if (file_put_contents($chunkPath, $binary) === false) {
            throw new RuntimeException('Failed to persist upload chunk.');
        }

        if ($chunkIndex + 1 < $totalChunks) {
            return [
                'completed' => false,
                'chunk_index' => $chunkIndex,
            ];
        }

        $assembledPath = $chunkDir.'/assembled.bin';

        try {
            $outStream = fopen($assembledPath, 'wb');
            if ($outStream === false) {
                throw new RuntimeException('Failed to initialize assembled upload file.');
            }

            try {
                for ($i = 0; $i < $totalChunks; $i++) {
                    $partFile = $chunkDir.'/part_'.$i;
                    if (! is_file($partFile)) {
                        throw new InvalidArgumentException("Missing upload chunk {$i}.");
                    }

                    $inStream = fopen($partFile, 'rb');
                    if ($inStream === false) {
                        throw new RuntimeException("Failed to read upload chunk {$i}.");
                    }

                    try {
                        stream_copy_to_stream($inStream, $outStream);
                    } finally {
                        fclose($inStream);
                    }
                }
            } finally {
                fclose($outStream);
            }

            $mime = $this->detectMimeType($assembledPath);
            if ($mime === null || ! str_starts_with($mime, 'image/')) {
                throw new InvalidArgumentException('Uploaded file must be a valid image.');
            }

            $extension = $this->resolveSafeExtension($filename, $mime);
            $targetPath = $normalizedDir.'/'.Str::uuid().'.'.$extension;

            $readStream = fopen($assembledPath, 'rb');
            if ($readStream === false) {
                throw new RuntimeException('Failed to open assembled image for storage.');
            }

            try {
                $stored = Storage::disk($this->disk)->writeStream($targetPath, $readStream);
                if (! $stored) {
                    throw new RuntimeException('Failed to write image to public storage.');
                }
            } finally {
                fclose($readStream);
            }

            return [
                'completed' => true,
                'path' => $targetPath,
                'url' => $this->url($targetPath),
            ];
        } finally {
            File::deleteDirectory($chunkDir);
        }
    }

    /**
     * Resolve either a freshly uploaded file, a pre-uploaded storage path, or an external URL.
     */
    public function resolveMediaValue(
        ?UploadedFile $file,
        ?string $pathOrUrl,
        ?string $currentPath,
        string $directory
    ): ?string {
        if ($file !== null) {
            return $currentPath
                ? $this->replace($currentPath, $file, $directory)
                : $this->upload($file, $directory);
        }

        if ($pathOrUrl === null || $pathOrUrl === $currentPath) {
            return $currentPath;
        }

        if (str_starts_with($pathOrUrl, 'http://') || str_starts_with($pathOrUrl, 'https://')) {
            $this->delete($currentPath);

            return $pathOrUrl;
        }

        $normalized = ltrim(str_replace('\\', '/', $pathOrUrl), '/');
        $expectedPrefix = trim(str_replace('\\', '/', $directory), '/').'/';

        if (str_contains($normalized, '..') || ! str_starts_with($normalized, $expectedPrefix)) {
            throw new InvalidArgumentException('Invalid image storage path.');
        }

        if (! Storage::disk($this->disk)->exists($normalized)) {
            throw new InvalidArgumentException('Uploaded image file could not be found in storage.');
        }

        $this->delete($currentPath);

        return $normalized;
    }

    /**
     * Delete an image from storage if it exists.
     */
    public function delete(?string $path): bool
    {
        if (empty($path)) {
            return false;
        }

        // If stored as full URL, cannot delete from local storage
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return false;
        }

        if (Storage::disk($this->disk)->exists($path)) {
            return Storage::disk($this->disk)->delete($path);
        }

        return false;
    }

    /**
     * Replace an old image with a new uploaded file.
     */
    public function replace(?string $oldPath, UploadedFile $newFile, string $directory = 'uploads'): string
    {
        $newPath = $this->upload($newFile, $directory);
        $this->delete($oldPath);

        return $newPath;
    }

    /**
     * Return public URL for the given image path.
     */
    public function url(?string $path, string $fallback = '/img/default.png'): string
    {
        if (empty($path)) {
            return $fallback;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        return '/storage/'.ltrim($path, '/');
    }

    protected function detectMimeType(string $filePath): ?string
    {
        if (! function_exists('finfo_open')) {
            return null;
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo === false) {
            return null;
        }

        try {
            $mime = finfo_file($finfo, $filePath);

            return is_string($mime) ? $mime : null;
        } finally {
            finfo_close($finfo);
        }
    }

    protected function resolveSafeExtension(string $filename, string $mime): string
    {
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif', 'heic', 'heif', 'tiff', 'tif', 'ico'];
        if (in_array($ext, $allowed, true)) {
            return $ext;
        }

        return match ($mime) {
            'image/jpeg' => 'jpg',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            'image/bmp', 'image/x-ms-bmp' => 'bmp',
            'image/avif' => 'avif',
            default => 'png',
        };
    }
}
