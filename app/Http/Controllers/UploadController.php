<?php

namespace App\Http\Controllers;

use App\Http\Requests\UploadChunkRequest;
use App\Services\ImageService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use InvalidArgumentException;
use Throwable;

class UploadController extends Controller
{
    public function __construct(
        protected ImageService $imageService
    ) {}

    public function chunk(UploadChunkRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();

            $result = $this->imageService->storeChunk(
                uploadId: $validated['upload_id'],
                chunkIndex: (int) $validated['chunk_index'],
                totalChunks: (int) $validated['total_chunks'],
                filename: $validated['filename'],
                directory: $validated['directory'],
                base64Data: $validated['data'],
            );

            $message = ($result['completed'] ?? false)
                ? 'Image uploaded successfully'
                : 'Chunk uploaded';

            return ApiResponse::success($result, $message);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (Throwable $e) {
            app_error_log('CHUNK_UPLOAD_FAILED', $e);

            return ApiResponse::error('Failed to process image upload.', 500);
        }
    }
}
