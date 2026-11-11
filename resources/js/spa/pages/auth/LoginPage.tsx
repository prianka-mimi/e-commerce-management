import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { authService } from '@/services/auth';
import { getApiErrorMessage } from '@/services/http';
import { Alert } from '@/components/ui';
import {
    ShieldIcon,
    StoreIcon,
    EyeIcon,
    EyeOffIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    UserIcon,
} from '@/components/Icons';
import type { User } from '@/types';

type AuthMode = 'login' | 'register' | 'forgot';
type ForgotStep = 'email' | 'otp' | 'password';

export default function LoginPage() {
    const { user, login, register } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const paramMode = searchParams.get('mode');
    const initialMode: AuthMode =
        paramMode === 'register' || paramMode === 'forgot' ? paramMode : 'login';
    const initialRole = searchParams.get('role') === 'seller' ? 'seller' : 'customer';
    const redirectTarget = searchParams.get('redirect');

    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [forgotStep, setForgotStep] = useState<ForgotStep>('email');
    const [registerRole, setRegisterRole] = useState<'customer' | 'seller'>(initialRole);

    // Auth / OTP Reset form states
    const [name, setName] = useState('');
    const [shopName, setShopName] = useState('');
    const [email, setEmail] = useState(searchParams.get('email') || '');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [localOtp, setLocalOtp] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        const nextMode = searchParams.get('mode');
        if (nextMode === 'register' || nextMode === 'forgot') {
            setMode(nextMode);
        } else {
            setMode('login');
        }
        if (searchParams.get('role') === 'seller') {
            setRegisterRole('seller');
        }
        const urlEmail = searchParams.get('email');
        if (urlEmail) setEmail(urlEmail);
    }, [searchParams]);

    function handleRedirectAfterAuth(authUser?: User) {
        if (redirectTarget === 'checkout') {
            navigate('/?checkout=1', { replace: true });
            return;
        }

        const roles = authUser?.role || user?.role || [];
        if (roles.includes('Admin')) {
            navigate('/admin/dashboard');
        } else if (roles.includes('Owner')) {
            navigate('/owner/dashboard');
        } else {
            navigate('/');
        }
    }

    async function handleLoginSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setLoading(true);

        try {
            const u = await login(email, password);
            showToast('Signed in successfully.', 'success');
            handleRedirectAfterAuth(u);
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err, 'Invalid credentials. Please verify your email and password.');
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    }

    async function handleRegisterSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setLoading(true);

        try {
            const u = await register({
                name,
                email,
                password,
                phone: phone || undefined,
                role: registerRole,
                shop_name: registerRole === 'seller' ? shopName : undefined,
            });

            showToast('Account created successfully.', 'success');
            handleRedirectAfterAuth(u);
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err, 'Registration failed. Please try again.');
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    }

    async function handleSendOtpSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setLocalOtp(null);
        setLoading(true);

        try {
            const res = await authService.forgotPassword(email);
            const issuedOtp = res.data?.data?.local_otp || null;
            if (issuedOtp) {
                setLocalOtp(issuedOtp);
                setOtp(issuedOtp);
            }
            const msg = res.data?.status_message || 'A 6-digit OTP has been sent to your email address.';
            setSuccessMessage(msg);
            showToast(msg, 'success');
            setForgotStep('otp');
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err, 'Failed to send verification OTP.');
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    }

    async function handleVerifyOtpSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (otp.trim().length !== 6) {
            const msg = 'Please enter the 6-digit OTP sent to your email.';
            setError(msg);
            showToast(msg, 'error');
            return;
        }

        setLoading(true);
        try {
            const res = await authService.verifyForgotOtp(email, otp);
            const verifiedToken = res.data?.data?.reset_token || '';
            setResetToken(verifiedToken);
            const msg = res.data?.status_message || 'OTP verified. Choose your new password.';
            setSuccessMessage(msg);
            showToast(msg, 'success');
            setForgotStep('password');
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err, 'Invalid or expired OTP.');
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    }

    async function handleResetSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (password.length < 8) {
            const msg = 'New password must be at least 8 characters.';
            setError(msg);
            showToast(msg, 'error');
            return;
        }
        if (password !== confirmPassword) {
            const msg = 'Password and confirmation do not match.';
            setError(msg);
            showToast(msg, 'error');
            return;
        }

        setLoading(true);
        try {
            const res = await authService.resetPassword({
                email,
                reset_token: resetToken,
                password,
                password_confirmation: confirmPassword,
            });
            setPassword('');
            setConfirmPassword('');
            setOtp('');
            setResetToken('');
            setLocalOtp(null);
            setForgotStep('email');
            switchMode('login');
            const msg = res.data?.status_message || 'Password reset successful. Please sign in with your new password.';
            setSuccessMessage(msg);
            showToast(msg, 'success');
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err, 'Invalid or expired reset session.');
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    }

    function handleFillCredentials(targetEmail: string, targetPass: string) {
        setEmail(targetEmail);
        setPassword(targetPass);
        setError(null);
        setSuccessMessage(null);
    }

    function switchMode(newMode: AuthMode, role: 'customer' | 'seller' = 'customer') {
        setMode(newMode);
        setRegisterRole(role);
        setError(null);
        setSuccessMessage(null);
        setForgotStep('email');
        setOtp('');
        setResetToken('');
        setLocalOtp(null);

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('token');
        if (newMode === 'login') {
            nextParams.delete('mode');
            nextParams.delete('role');
        } else {
            nextParams.set('mode', newMode);
            if (newMode === 'register' && role === 'seller') {
                nextParams.set('role', 'seller');
            } else {
                nextParams.delete('role');
            }
        }
        setSearchParams(nextParams);
    }

    const headingTitle =
        mode === 'login'
            ? 'Welcome Back'
            : mode === 'forgot'
            ? forgotStep === 'email'
                ? 'Reset Your Password'
                : forgotStep === 'otp'
                ? 'Verify OTP Code'
                : 'Set a New Password'
            : registerRole === 'seller'
            ? 'Join as Certified Seller'
            : 'Create Customer Account';

    const headingSubtitle =
        mode === 'login'
            ? 'Sign in to access your dashboard, orders, or store management'
            : mode === 'forgot'
            ? forgotStep === 'email'
                ? 'Enter your account email to receive a 6-digit verification OTP'
                : forgotStep === 'otp'
                ? 'Enter the 6-digit OTP sent to your email address'
                : 'Choose a new password for your account'
            : registerRole === 'seller'
            ? 'Open your merchant storefront with custom pricing and live catalog'
            : 'Sign up to purchase products across all verified merchant stores';

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-md w-full space-y-6 relative z-10">
                {/* Brand Logo & Heading */}
                <div className="text-center">
                    <Link to="/" className="inline-flex items-center gap-2.5 group mb-3">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform font-black text-lg">
                            S
                        </div>
                        <span className="text-2xl font-black tracking-tight text-white">
                            Shop<span className="text-indigo-400">Market</span>
                        </span>
                    </Link>

                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {headingTitle}
                    </h1>
                    <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
                        {headingSubtitle}
                    </p>
                </div>

                {/* Main Auth Card */}
                <div className="bg-white rounded-3xl p-7 sm:p-8 shadow-2xl border border-slate-100">
                    {(mode === 'login' || mode === 'register') && (
                        <div className="flex rounded-2xl bg-slate-100 p-1 mb-6 border border-slate-200/80">
                            <button
                                type="button"
                                onClick={() => switchMode('login')}
                                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                                    mode === 'login'
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                Sign In
                            </button>
                            <button
                                type="button"
                                onClick={() => switchMode('register', 'customer')}
                                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                                    mode === 'register'
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                Create Account
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4">
                            <Alert type="error" message={error} />
                        </div>
                    )}
                    {successMessage && (
                        <div className="mb-4">
                            <Alert type="success" message={successMessage} />
                        </div>
                    )}

                    {/* LOGIN FORM */}
                    {mode === 'login' && (
                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                                >
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium transition-all"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label
                                        htmlFor="password"
                                        className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                                    >
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => switchMode('forgot')}
                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        placeholder="********"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                        title={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
                                            <EyeOffIcon className="w-4 h-4" />
                                        ) : (
                                            <EyeIcon className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 mt-2"
                            >
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <ArrowRightIcon className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                            <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
                                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
                                    Demo Credentials (Click to fill):
                                </span>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        disabled={loading}
                                        onClick={() => handleFillCredentials('admin@admin.com', '12345678')}
                                        className="py-2.5 px-3 rounded-xl border border-slate-200 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs group"
                                        title="Click to fill Admin credentials"
                                    >
                                        <ShieldIcon className="w-3.5 h-3.5 text-indigo-600" />
                                        <span>Login as Admin</span>
                                    </button>

                                    <button
                                        type="button"
                                        disabled={loading}
                                        onClick={() => handleFillCredentials('owner@shop.com', '12345678')}
                                        className="py-2.5 px-3 rounded-xl border border-slate-200 hover:border-purple-500 bg-slate-50 hover:bg-purple-50/50 text-slate-700 hover:text-purple-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs group"
                                        title="Click to fill Store Owner credentials"
                                    >
                                        <StoreIcon className="w-3.5 h-3.5 text-purple-600" />
                                        <span>Login as Store Owner</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* REGISTRATION FORM */}
                    {mode === 'register' && (
                        <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl mb-3">
                                <button
                                    type="button"
                                    onClick={() => setRegisterRole('customer')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                        registerRole === 'customer'
                                            ? 'bg-white text-indigo-700 shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <UserIcon className="w-3.5 h-3.5" />
                                    <span>Customer</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRegisterRole('seller')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                        registerRole === 'seller'
                                            ? 'bg-white text-purple-700 shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <StoreIcon className="w-3.5 h-3.5" />
                                    <span>Store Owner</span>
                                </button>
                            </div>

                            <div>
                                <label
                                    htmlFor="reg-name"
                                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                                >
                                    Full Name
                                </label>
                                <input
                                    id="reg-name"
                                    type="text"
                                    required
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium"
                                />
                            </div>

                            {registerRole === 'seller' && (
                                <div>
                                    <label
                                        htmlFor="reg-shop-name"
                                        className="block text-xs font-bold uppercase tracking-wider text-purple-700 mb-1"
                                    >
                                        Store / Business Name *
                                    </label>
                                    <input
                                        id="reg-shop-name"
                                        type="text"
                                        required
                                        placeholder="e.g. Apex Tech Essentials"
                                        value={shopName}
                                        onChange={(e) => setShopName(e.target.value)}
                                        className="w-full px-3.5 py-2 rounded-xl border border-purple-200 bg-purple-50/30 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900 font-medium"
                                    />
                                </div>
                            )}

                            <div>
                                <label
                                    htmlFor="reg-email"
                                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                                >
                                    Email Address
                                </label>
                                <input
                                    id="reg-email"
                                    type="email"
                                    required
                                    placeholder="john@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="reg-phone"
                                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                                >
                                    Phone Number (Optional)
                                </label>
                                <input
                                    id="reg-phone"
                                    type="tel"
                                    placeholder="01700000000"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="reg-pass"
                                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                                >
                                    Password (Min 6 Characters)
                                </label>
                                <div className="relative">
                                    <input
                                        id="reg-pass"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        minLength={6}
                                        placeholder="********"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-3.5 pr-10 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                        title={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
                                            <EyeOffIcon className="w-4 h-4" />
                                        ) : (
                                            <EyeIcon className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 mt-4 ${
                                    registerRole === 'seller'
                                        ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30'
                                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
                                }`}
                            >
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Creating account...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>
                                            {registerRole === 'seller'
                                                ? 'Register Store & Start Selling'
                                                : 'Register as Customer'}
                                        </span>
                                        <ArrowRightIcon className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* FORGOT PASSWORD STEP 1: SEND OTP */}
                    {mode === 'forgot' && forgotStep === 'email' && (
                        <form onSubmit={handleSendOtpSubmit} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="forgot-email"
                                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                                >
                                    Account Email Address *
                                </label>
                                <input
                                    id="forgot-email"
                                    type="email"
                                    required
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Sending OTP...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Send 6-Digit OTP</span>
                                        <ArrowRightIcon className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                            <div className="flex items-center justify-between pt-2 text-xs">
                                <button
                                    type="button"
                                    onClick={() => switchMode('login')}
                                    className="font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                                >
                                    Back to Sign In
                                </button>
                            </div>
                        </form>
                    )}

                    {/* FORGOT PASSWORD STEP 2: VERIFY OTP */}
                    {mode === 'forgot' && forgotStep === 'otp' && (
                        <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                            {localOtp && (
                                <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
                                    Local Dev OTP (mail driver is log): <strong className="font-mono tracking-widest">{localOtp}</strong>
                                </div>
                            )}

                            <div>
                                <label
                                    htmlFor="forgot-otp"
                                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                                >
                                    6-Digit OTP Code *
                                </label>
                                <input
                                    id="forgot-otp"
                                    type="text"
                                    required
                                    maxLength={6}
                                    pattern="[0-9]{6}"
                                    placeholder="Enter 6-digit OTP"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Verifying OTP...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Verify OTP</span>
                                        <ArrowRightIcon className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                            <div className="flex items-center justify-between pt-2 text-xs">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setForgotStep('email');
                                        setError(null);
                                        setSuccessMessage(null);
                                    }}
                                    className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                                >
                                    Change email / Resend OTP
                                </button>
                                <button
                                    type="button"
                                    onClick={() => switchMode('login')}
                                    className="font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                                >
                                    Back to Sign In
                                </button>
                            </div>
                        </form>
                    )}

                    {/* FORGOT PASSWORD STEP 3: NEW PASSWORD */}
                    {mode === 'forgot' && forgotStep === 'password' && (
                        <form onSubmit={handleResetSubmit} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="reset-password"
                                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                                >
                                    New Password (Min 8 Characters) *
                                </label>
                                <div className="relative">
                                    <input
                                        id="reset-password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        minLength={8}
                                        placeholder="Enter new password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? (
                                            <EyeOffIcon className="w-4 h-4" />
                                        ) : (
                                            <EyeIcon className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="reset-password-confirm"
                                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                                >
                                    Confirm New Password *
                                </label>
                                <input
                                    id="reset-password-confirm"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    minLength={8}
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-medium"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Updating password...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Update Password</span>
                                        <ArrowRightIcon className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                            <div className="flex items-center justify-between pt-2 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setForgotStep('email')}
                                    className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                                >
                                    Request new OTP
                                </button>
                                <button
                                    type="button"
                                    onClick={() => switchMode('login')}
                                    className="font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                                >
                                    Back to Sign In
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Back link */}
                    <div className="text-center pt-5 mt-5 border-t border-slate-100">
                        <Link
                            to="/"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                            <ArrowLeftIcon className="w-3.5 h-3.5" />
                            <span>Return to Customer Storefront</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
