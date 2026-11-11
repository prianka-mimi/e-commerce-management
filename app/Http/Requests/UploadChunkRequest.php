<?php

namespace App\Http\Requests;

use App\Services\ImageService;
use Illuminate\Foundation\Http\FormRequest;

class UploadChunkRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        if ($this->input('directory') === 'uploads/users') {
            return true;
        }

        return $user->isAdmin() || $user->isOwner();
    }

    public function rules(): array
    {
        return [
            'upload_id' => ['required', 'uuid'],
            'chunk_index' => ['required', 'integer', 'min:0'],
            'total_chunks' => ['required', 'integer', 'min:1'],
            'filename' => ['required', 'string', 'max:255'],
            'directory' => ['required', 'string', 'in:'.implode(',', ImageService::ALLOWED_DIRECTORIES)],
            'data' => ['required', 'string'],
        ];
    }
}
