<?php

namespace App\Http\Controllers;

use App\DataObjects\CustomerCheckoutData;
use App\Http\Requests\CustomerCheckoutRequest;
use App\Http\Resources\CustomerOrderResource;
use App\Services\CustomerOrderService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use InvalidArgumentException;
use Throwable;

class CustomerOrderController extends Controller
{
    public function __construct(
        protected CustomerOrderService $orderService,
    ) {}

    public function checkout(CustomerCheckoutRequest $request): JsonResponse
    {
        try {
            $data = CustomerCheckoutData::fromRequest($request->validated());
            $order = $this->orderService->checkout($data);

            return ApiResponse::success(
                new CustomerOrderResource($order),
                __('Order placed successfully. Thank you for your purchase!'),
                201
            );
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        } catch (Throwable $e) {
            app_error_log('CUSTOMER_CHECKOUT_FAILED', $e);

            return ApiResponse::error('Failed to process order. Please try again.', 500);
        }
    }
}
