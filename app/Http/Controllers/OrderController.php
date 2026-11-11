<?php

namespace App\Http\Controllers;

use App\Http\Resources\OrderListResource;
use App\Models\Order;
use App\Support\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Throwable;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            Gate::authorize('viewAny', Order::class);

            $user = $request->user();
            $query = Order::query()->with(['company', 'customer', 'items.product', 'items.shopProduct.product']);

            if ($user && $user->isOwner()) {
                $shopId = $user->company_id ?: ($user->ownedShop()->value('id') ?? 0);
                $query->where('company_id', $shopId);
            } elseif ($request->filled('company_id')) {
                $query->where('company_id', (int) $request->input('company_id'));
            }

            if ($request->filled('status')) {
                $query->where('status', (int) $request->input('status'));
            }

            if ($request->filled('trx_id')) {
                $query->where('trx_id', 'like', '%'.trim($request->input('trx_id')).'%');
            }

            $perPage = (int) $request->input('per_page', 20);
            $orders = $query->orderByDesc('id')->paginate($perPage);

            return ApiResponse::success(
                OrderListResource::collection($orders),
                'Orders retrieved successfully'
            );
        } catch (AuthorizationException $e) {
            return ApiResponse::error($e->getMessage() ?: 'Unauthorized.', 403);
        } catch (Throwable $e) {
            app_error_log('ORDER_FETCH_FAILED', $e);

            return ApiResponse::error('Failed to retrieve orders.', 500);
        }
    }

    public function update(Request $request, Order $order): JsonResponse
    {
        try {
            Gate::authorize('update', $order);

            $validated = $request->validate([
                'status' => ['required', 'integer', 'in:'.implode(',', array_keys(Order::STATUS_LIST))],
            ]);

            $order->update(['status' => (int) $validated['status']]);

            return ApiResponse::success(
                new OrderListResource($order->fresh(['company', 'customer', 'items.product', 'items.shopProduct.product'])),
                'Order status updated successfully'
            );
        } catch (AuthorizationException $e) {
            return ApiResponse::error($e->getMessage() ?: 'Unauthorized.', 403);
        } catch (ValidationException $e) {
            return ApiResponse::error($e->getMessage(), 422, $e->errors());
        } catch (Throwable $e) {
            app_error_log('ORDER_UPDATE_FAILED', $e);

            return ApiResponse::error('Failed to update order status.', 500);
        }
    }
}
