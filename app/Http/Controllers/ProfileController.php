<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Http\Resources\UserDetailsResource;
use App\Models\User;
use App\Services\ImageService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use InvalidArgumentException;
use Throwable;

class ProfileController extends Controller
{
    public function __construct(
        protected ImageService $imageService
    ) {}

    public function updateProfile(ProfileUpdateRequest $request): JsonResponse
    {
        try {
            $user = $request->user();
            $data = $request->validated();
            $photoInput = $data['photo'] ?? null;
            unset($data['photo']);

            $resolvedPhoto = $this->imageService->resolveMediaValue(
                $request->file('photo'),
                is_string($photoInput) && trim($photoInput) !== '' ? trim($photoInput) : null,
                $user->photo,
                User::AVATAR_PATH
            );

            if ($resolvedPhoto !== $user->photo) {
                $data['photo'] = $resolvedPhoto;
            }

            $user->update($data);

            return ApiResponse::success(
                new UserDetailsResource($user->fresh(['roles', 'company'])),
                'Profile updated successfully'
            );
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (Throwable $e) {
            app_error_log('PROFILE_UPDATE_FAILED', $e);

            return ApiResponse::error('Failed to update profile.', 500);
        }
    }
}
