<?php

namespace App\Http\Middleware;

use App\Models\Company;
use Closure;
use Illuminate\Http\Request;
use stdClass;
use Symfony\Component\HttpFoundation\Response;

class CompanyMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! auth()->check()) {
            return $next($request);
        }

        $user = auth()->user();

        if ($user->hasRole('Admin')) {
            $company = new stdClass;
            $company->id = null;
            $company->name = 'Global Administration';
            app()->instance('company', $company);

            return $next($request);
        }

        if ($user->hasRole('Owner')) {
            $ownerCompany = null;

            if ($user->company_id) {
                $ownerCompany = Company::query()
                    ->where('id', $user->company_id)
                    ->where('status', Company::STATUS_ACTIVE)
                    ->first();
            }

            if (! $ownerCompany) {
                $ownerCompany = Company::query()
                    ->where('user_id', $user->id)
                    ->where('status', Company::STATUS_ACTIVE)
                    ->where('is_default', Company::IS_DEFAULT)
                    ->first();
            }

            if (! $ownerCompany) {
                $ownerCompany = Company::query()
                    ->where('user_id', $user->id)
                    ->where('status', Company::STATUS_ACTIVE)
                    ->first();
            }

            if (! $ownerCompany && $user->company_id) {
                $ownerCompany = Company::find($user->company_id);
            }

            if ($ownerCompany) {
                app()->instance('company', $ownerCompany);
            } else {
                $stub = new stdClass;
                $stub->id = null;
                $stub->name = null;
                app()->instance('company', $stub);
            }

            return $next($request);
        }

        if ($user->company_id) {
            $company = Company::find($user->company_id);
            if ($company) {
                app()->instance('company', $company);

                return $next($request);
            }
        }

        $stub = new stdClass;
        $stub->id = null;
        $stub->name = null;
        app()->instance('company', $stub);

        return $next($request);
    }
}
