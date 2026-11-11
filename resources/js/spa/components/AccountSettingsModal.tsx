import { useState, useEffect, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth';
import { uploadImageChunked } from '@/services/upload';
import { getApiErrorMessage } from '@/services/http';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Modal, Alert } from '@/components/ui';
import { ImageUploadField } from '@/components/ImageUploadField';
import { EyeIcon, EyeOffIcon, UserIcon, LockIcon, ShieldIcon, ArrowRightIcon } from '@/components/Icons';

interface AccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'profile' | 'email' | 'password';
    showSignOut?: boolean;
}

export function AccountSettingsModal({
    isOpen,
    onClose,
    initialTab = 'profile',
    showSignOut = false,
}: AccountSettingsModalProps) {
    const navigate = useNavigate();
    const { user, updateUser, logout } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'profile' | 'email' | 'password'>(initialTab);

    // Profile state (avatar, name, phone)
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [profileError, setProfileError] = useState<string | null>(null);

    // Email OTP change state
    const [emailStep, setEmailStep] = useState<'request' | 'verify'>('request');
    const [currentEmailInput, setCurrentEmailInput] = useState('');
    const [emailOtp, setEmailOtp] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [localEmailOtp, setLocalEmailOtp] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);

    // Password state
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const [isSigningOut, setIsSigningOut] = useState(false);

    useEffect(() => {
        if (!isOpen || !user) return;
        setActiveTab(initialTab);
        setName(user.name || '');
        setPhone(user.phone || '');
        setPhotoFile(null);
        setUploadProgress(null);
        setProfileError(null);

        setEmailStep('request');
        setCurrentEmailInput('');
        setEmailOtp('');
        setNewEmail('');
        setLocalEmailOtp(null);
        setEmailError(null);

        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError(null);
    }, [isOpen, user, initialTab]);

    const profileMutation = useMutation({
        mutationFn: async () => {
            let uploadedPhotoPath: string | null = null;
            if (photoFile) {
                setUploadProgress(0);
                uploadedPhotoPath = await uploadImageChunked(
                    photoFile,
                    'uploads/users',
                    setUploadProgress
                );
            }

            const fd = new FormData();
            fd.append('name', name);
            fd.append('phone', phone);
            if (uploadedPhotoPath) {
                fd.append('photo', uploadedPhotoPath);
            }

            const res = await authService.updateProfile(fd);
            return res.data.data;
        },
        onSuccess: (updatedUser) => {
            setUploadProgress(null);
            setPhotoFile(null);
            if (updatedUser) {
                updateUser(updatedUser);
            }
            setProfileError(null);
            showToast('Profile updated successfully.', 'success');
        },
        onError: (err: unknown) => {
            setUploadProgress(null);
            const msg = getApiErrorMessage(err, 'Failed to update profile.');
            setProfileError(msg);
            showToast(msg, 'error');
        },
    });

    const sendEmailOtpMutation = useMutation({
        mutationFn: async () => {
            return await authService.sendEmailChangeOtp(currentEmailInput);
        },
        onSuccess: (res) => {
            setEmailError(null);
            const devOtp = res.data?.data?.local_otp || null;
            setLocalEmailOtp(devOtp);
            if (devOtp) {
                setEmailOtp(devOtp);
            }
            setEmailStep('verify');
            showToast(
                res.data?.status_message || 'OTP sent to your current email address.',
                'success'
            );
        },
        onError: (err: unknown) => {
            const msg = getApiErrorMessage(err, 'Failed to send verification OTP.');
            setEmailError(msg);
            showToast(msg, 'error');
        },
    });

    const verifyEmailChangeMutation = useMutation({
        mutationFn: async () => {
            return await authService.verifyEmailChange({
                otp: emailOtp,
                new_email: newEmail,
            });
        },
        onSuccess: (res) => {
            setEmailError(null);
            if (res.data?.data) {
                updateUser(res.data.data);
            }
            setEmailStep('request');
            setCurrentEmailInput('');
            setEmailOtp('');
            setNewEmail('');
            setLocalEmailOtp(null);
            showToast(res.data?.status_message || 'Email address updated successfully.', 'success');
        },
        onError: (err: unknown) => {
            const msg = getApiErrorMessage(err, 'Invalid OTP or failed to change email.');
            setEmailError(msg);
            showToast(msg, 'error');
        },
    });

    const passwordMutation = useMutation({
        mutationFn: async () => {
            return await authService.changePassword({
                old_password: oldPassword,
                new_password: newPassword,
            });
        },
        onSuccess: (res) => {
            setPasswordError(null);
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            showToast(res.data?.status_message || 'Password updated successfully.', 'success');
        },
        onError: (err: unknown) => {
            const msg = getApiErrorMessage(err, 'Failed to update password.');
            setPasswordError(msg);
            showToast(msg, 'error');
        },
    });

    function handleProfileSubmit(e: FormEvent) {
        e.preventDefault();
        setProfileError(null);
        profileMutation.mutate();
    }

    function handleEmailRequestSubmit(e: FormEvent) {
        e.preventDefault();
        setEmailError(null);
        sendEmailOtpMutation.mutate();
    }

    function handleEmailVerifySubmit(e: FormEvent) {
        e.preventDefault();
        setEmailError(null);
        if (emailOtp.trim().length !== 6) {
            const msg = 'Please enter the 6-digit OTP.';
            setEmailError(msg);
            showToast(msg, 'error');
            return;
        }
        verifyEmailChangeMutation.mutate();
    }

    function handlePasswordSubmit(e: FormEvent) {
        e.preventDefault();
        setPasswordError(null);

        if (newPassword.length < 8) {
            const msg = 'New password must be at least 8 characters.';
            setPasswordError(msg);
            showToast(msg, 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            const msg = 'New password and confirmation do not match.';
            setPasswordError(msg);
            showToast(msg, 'error');
            return;
        }

        passwordMutation.mutate();
    }

    async function handleSignOut() {
        setIsSigningOut(true);
        try {
            await logout();
            onClose();
            showToast('Signed out successfully.', 'info');
            navigate('/');
        } catch (err: unknown) {
            showToast(getApiErrorMessage(err, 'Failed to sign out.'), 'error');
        } finally {
            setIsSigningOut(false);
        }
    }

    function renderSignOutAction() {
        if (!showSignOut) return <div />;
        return (
            <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors disabled:opacity-50"
            >
                <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
        );
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Account Settings"
            size="lg"
        >
            <div className="space-y-6">
                {/* Tabs */}
                <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200/80 gap-1">
                    <button
                        type="button"
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'profile'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>Profile</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('email')}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'email'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <ShieldIcon className="w-3.5 h-3.5" />
                        <span>Change Email</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('password')}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'password'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <LockIcon className="w-3.5 h-3.5" />
                        <span>Password</span>
                    </button>
                </div>

                {/* Tab 1: Profile & Photo */}
                {activeTab === 'profile' && (
                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                        {profileError && <Alert type="error" message={profileError} />}

                        <ImageUploadField
                            label="Profile Picture"
                            file={photoFile}
                            onChange={setPhotoFile}
                            currentImageUrl={user?.photo}
                            fallbackType="user"
                            helperText="Choose an image to preview and update your profile photo."
                            progress={uploadProgress}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="Optional"
                                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Verified Email
                                </span>
                                <span className="text-sm font-semibold text-slate-800 truncate block">
                                    {user?.email}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveTab('email')}
                                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 text-xs font-bold text-indigo-600 transition-colors shrink-0"
                            >
                                Change via OTP
                            </button>
                        </div>

                        <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                            {renderSignOutAction()}
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    disabled={profileMutation.isPending}
                                    className="px-6 py-2.5 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 shadow-md shadow-indigo-600/25 transition-all"
                                >
                                    {profileMutation.isPending ? 'Saving...' : 'Save Profile'}
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {/* Tab 2: Change Email via OTP */}
                {activeTab === 'email' && (
                    emailStep === 'request' ? (
                        <form onSubmit={handleEmailRequestSubmit} className="space-y-4">
                            {emailError && <Alert type="error" message={emailError} />}

                            <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed">
                                To change your email address, enter your current email address below. We will send a 6-digit OTP to your current email to verify ownership first.
                            </p>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Current Email Address *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={currentEmailInput}
                                    onChange={(e) => setCurrentEmailInput(e.target.value)}
                                    placeholder={user?.email || 'Enter your current email'}
                                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                                {renderSignOutAction()}
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-5 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={sendEmailOtpMutation.isPending}
                                        className="px-6 py-2.5 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 shadow-md shadow-indigo-600/25 transition-all"
                                    >
                                        {sendEmailOtpMutation.isPending ? 'Sending OTP...' : 'Send OTP'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleEmailVerifySubmit} className="space-y-4">
                            {emailError && <Alert type="error" message={emailError} />}

                            <div className="text-xs text-slate-600 bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 flex items-center justify-between gap-2">
                                <span>
                                    OTP sent to <strong>{currentEmailInput}</strong>. Enter the 6-digit OTP and your new email address.
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEmailStep('request');
                                        setEmailError(null);
                                    }}
                                    className="font-bold text-indigo-700 hover:underline shrink-0"
                                >
                                    Back
                                </button>
                            </div>

                            {localEmailOtp && (
                                <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
                                    Local Dev OTP (mail driver is log): <strong className="font-mono tracking-widest">{localEmailOtp}</strong>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    6-Digit Verification OTP *
                                </label>
                                <input
                                    type="text"
                                    required
                                    maxLength={6}
                                    pattern="[0-9]{6}"
                                    value={emailOtp}
                                    onChange={(e) => setEmailOtp(e.target.value)}
                                    placeholder="6-digit OTP"
                                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    New Email Address *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="new-email@example.com"
                                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                                {renderSignOutAction()}
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-5 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={verifyEmailChangeMutation.isPending}
                                        className="px-6 py-2.5 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 shadow-md shadow-indigo-600/25 transition-all"
                                    >
                                        {verifyEmailChangeMutation.isPending ? 'Verifying...' : 'Verify & Update Email'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )
                )}

                {/* Tab 3: Change Password */}
                {activeTab === 'password' && (
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        {passwordError && <Alert type="error" message={passwordError} />}

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Current Password *
                            </label>
                            <div className="relative">
                                <input
                                    type={showOldPassword ? 'text' : 'password'}
                                    required
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    placeholder="Enter current password"
                                    className="w-full pl-3.5 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowOldPassword(!showOldPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    {showOldPassword ? (
                                        <EyeOffIcon className="w-4 h-4" />
                                    ) : (
                                        <EyeIcon className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                New Password (Min 8 Characters) *
                            </label>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    required
                                    minLength={8}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full pl-3.5 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    {showNewPassword ? (
                                        <EyeOffIcon className="w-4 h-4" />
                                    ) : (
                                        <EyeIcon className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Confirm New Password *
                            </label>
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                required
                                minLength={8}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repeat new password"
                                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                            {renderSignOutAction()}
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    disabled={passwordMutation.isPending}
                                    className="px-6 py-2.5 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 shadow-md shadow-indigo-600/25 transition-all"
                                >
                                    {passwordMutation.isPending ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    );
}
