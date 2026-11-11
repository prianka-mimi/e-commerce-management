<?php

namespace App\Http\Controllers;

use App\DataObjects\UserData;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserDetailsResource;
use App\Http\Resources\UserListResource;
use App\Models\User;
use App\Services\UserService;
use App\Support\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use InvalidArgumentException;
use Throwable;

class UserController extends Controller
{
    public function __construct(
        protected UserService $userService
    ) {}

    public function index(Request $request): JsonResponse
    {
        try {
            Gate::authorize('viewAny', User::class);
            $perPage = (int) $request->input('per_page', 20);
            $users = $this->userService->paginate($request->all(), $perPage);

            return ApiResponse::success(
                UserListResource::collection($users),
                'Users retrieved successfully'
            );
        } catch (AuthorizationException $e) {
            return ApiResponse::error($e->getMessage() ?: 'Unauthorized.', 403);
        } catch (Throwable $e) {
            app_error_log('USER_FETCH_FAILED', $e);

            return ApiResponse::error('Failed to retrieve users.', 500);
        }
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        try {
            Gate::authorize('create', User::class);
            $dto = UserData::fromArray($request->validated(), $request->file('photo'));
            $user = $this->userService->create($dto);

            return ApiResponse::success(
                new UserDetailsResource($user),
                'User account created successfully',
                201
            );
        } catch (AuthorizationException $e) {
            return ApiResponse::error($e->getMessage() ?: 'Unauthorized.', 403);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (Throwable $e) {
            app_error_log('USER_STORE_FAILED', $e);

            return ApiResponse::error('Failed to create user account.', 500);
        }
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        try {
            Gate::authorize('update', $user);
            $dto = UserData::fromArray($request->validated(), $request->file('photo'));
            $updated = $this->userService->update($user, $dto);

            return ApiResponse::success(
                new UserDetailsResource($updated),
                'User account updated successfully'
            );
        } catch (AuthorizationException $e) {
            return ApiResponse::error($e->getMessage() ?: 'Unauthorized.', 403);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (Throwable $e) {
            app_error_log('USER_UPDATE_FAILED', $e);

            return ApiResponse::error('Failed to update user account.', 500);
        }
    }

    public function destroy(User $user): JsonResponse
    {
        try {
            Gate::authorize('delete', $user);

            if ((int) $user->id === (int) auth()->id()) {
                return ApiResponse::error('You cannot delete your own account.', 400);
            }

            $this->userService->delete($user);

            return ApiResponse::success(null, 'User account deleted successfully');
        } catch (AuthorizationException $e) {
            return ApiResponse::error($e->getMessage() ?: 'Unauthorized.', 403);
        } catch (Throwable $e) {
            app_error_log('USER_DELETE_FAILED', $e);

            return ApiResponse::error('Failed to delete user account.', 500);
        }
    }

    public function resetPassword(User $user): JsonResponse
    {
        try {
            Gate::authorize('resetPassword', $user);
            $this->userService->resetPassword($user);

            return ApiResponse::success(null, 'User password has been reset to 12345678');
        } catch (AuthorizationException $e) {
            return ApiResponse::error($e->getMessage() ?: 'Unauthorized.', 403);
        } catch (Throwable $e) {
            app_error_log('USER_PASSWORD_RESET_FAILED', $e);

            return ApiResponse::error('Failed to reset user password.', 500);
        }
    }
}
