<?php

namespace App\Http\Controllers;

use App\DataObjects\CompanyData;
use App\Http\Requests\StoreCompanyRequest;
use App\Http\Requests\UpdateCompanyRequest;
use App\Http\Resources\CompanyResource;
use App\Models\Company;
use App\Models\ShopProduct;
use App\Services\CompanyService;
use App\Support\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use InvalidArgumentException;
use Throwable;

class CompanyController extends Controller
{
    public function __construct(
        protected CompanyService $companyService
    ) {}

    public function index(Request $request): JsonResponse
    {
        try {
            Gate::authorize('viewAny', Company::class);

            $user = $request->user();
            if ($user && ! $user->isAdmin()) {
                $shopId = $user->company_id ?: ($user->ownedShop()->value('id') ?? 0);
                $shops = Company::query()
                    ->with(['owner'])
                    ->withCount(['shopProducts' => fn ($q) => $q->where('status', ShopProduct::STATUS_ACTIVE)])
                    ->where('id', $shopId)
                    ->paginate((int) $request->input('per_page', 20));

                return ApiResponse::success(
                    CompanyResource::collection($shops),
                    'Shops retrieved successfully'
                );
            }

            $perPage = (int) $request->input('per_page', 20);
            $shops = $this->companyService->paginate($request->all(), $perPage);

            return ApiResponse::success(
                CompanyResource::collection($shops),
                'Shops retrieved successfully'
            );
        } catch (AuthorizationException $e) {
            return ApiResponse::error($e->getMessage() ?: 'Unauthorized.', 403);
        } catch (Throwable $e) {
            app_error_log('COMPANY_FETCH_FAILED', $e);

            return ApiResponse::error('Failed to retrieve shops.', 500);
        }
    }

    public function show(Company $company): JsonResponse
    {
        try {
            Gate::authorize('view', $company);
            $company->load(['owner', 'shopProducts.product']);

            return ApiResponse::success(
                new CompanyResource($company),
                'Shop details retrieved successfully'
            );
        } catch (AuthorizationException $e) {
            return ApiResponse::error($e->getMessage() ?: 'Unauthorized.', 403);
        } catch (Throwable $e) {
            app_error_log('COMPANY_SHOW_FAILED', $e);

            return ApiResponse::error('Failed to retrieve shop details.', 500);
        }
    }

    public function store(StoreCompanyRequest $request): JsonResponse
    {
        try {
            Gate::authorize('create', Company::class);
            $dto = CompanyData::fromArray($request->validated(), $request->file('logo'));
            $company = $this->companyService->create($dto);

            return ApiResponse::success(
                new CompanyResource($company),
                'Shop created successfully',
                201
            );
        } catch (AuthorizationException $e) {
            return ApiResponse::error($e->getMessage() ?: 'Unauthorized.', 403);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (Throwable $e) {
            app_error_log('COMPANY_STORE_FAILED', $e);

            return ApiResponse::error('Failed to create shop.', 500);
        }
    }

    public function update(UpdateCompanyRequest $request, Company $company): JsonResponse
    {
        try {
            Gate::authorize('update', $company);
            $dto = CompanyData::fromArray($request->validated(), $request->file('logo'));
            $updated = $this->companyService->update($company, $dto);

            return ApiResponse::success(
                new CompanyResource($updated),
                'Shop updated successfully'
            );
        } catch (AuthorizationException $e) {
            return ApiResponse::error($e->getMessage() ?: 'Unauthorized.', 403);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (Throwable $e) {
            app_error_log('COMPANY_UPDATE_FAILED', $e);

            return ApiResponse::error('Failed to update shop.', 500);
        }
    }

    public function destroy(Company $company): JsonResponse
    {
        try {
            Gate::authorize('delete', $company);
            $this->companyService->delete($company);

            return ApiResponse::success(null, 'Shop deleted successfully');
        } catch (AuthorizationException $e) {
            return ApiResponse::error($e->getMessage() ?: 'Unauthorized.', 403);
        } catch (Throwable $e) {
            app_error_log('COMPANY_DELETE_FAILED', $e);

            return ApiResponse::error('Failed to delete shop.', 500);
        }
    }
}
