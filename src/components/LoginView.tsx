import { ArrowLeft, Building2, CheckCircle2, KeyRound, MapPin, RotateCcw, ShieldAlert, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';
import { apiRequest, setAuthToken } from '../api';
import type { AuthUser, UserRole } from '../types';

interface LoginViewProps {
  defaultRole?: UserRole;
  prefillUserId?: string;
  onBackHome: () => void;
  onGoRegister: () => void;
  onLoginSuccess: (user: AuthUser) => void;
}

export function LoginView({
  defaultRole = 'COURT',
  prefillUserId = '',
  onBackHome,
  onGoRegister,
  onLoginSuccess
}: LoginViewProps) {
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [loginType, setLoginType] = useState<UserRole>(defaultRole);
  const [userId, setUserId] = useState(prefillUserId);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reset password fields
  const [resetRole, setResetRole] = useState<'COURT' | 'PATWARI'>(
    defaultRole === 'PATWARI' ? 'PATWARI' : 'COURT'
  );
  const [resetUserId, setResetUserId] = useState(prefillUserId);
  const [resetPhone, setResetPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const res = await apiRequest<{ user: AuthUser; token?: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          loginType,
          userId: userId.trim(),
          password
        })
      });
      if (res.token) {
        setAuthToken(res.token);
      }
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const res = await apiRequest<{ message: string; userId: string; role: UserRole }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          loginType: resetRole,
          userId: resetUserId.trim(),
          phone: resetPhone.trim(),
          newPassword,
          confirmPassword: confirmNewPassword
        })
      });
      setLoginType(res.role);
      setUserId(res.userId);
      setPassword('');
      setResetPhone('');
      setNewPassword('');
      setConfirmNewPassword('');
      setMode('login');
      setSuccessMsg(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed.');
    } finally {
      setSubmitting(false);
    }
  }

  function openResetMode() {
    setError('');
    setSuccessMsg('');
    setResetRole(loginType === 'PATWARI' ? 'PATWARI' : 'COURT');
    setResetUserId(userId);
    setResetPhone('');
    setNewPassword('');
    setConfirmNewPassword('');
    setMode('reset');
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="h-1 w-full bg-gradient-to-r from-[#C27803] via-[#0B1F3A] to-[#047857]" />
      <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#0F2942] cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shahdol Division Home
          </button>
          <button
            type="button"
            onClick={onGoRegister}
            className="text-sm font-medium text-[#0F2942] hover:underline cursor-pointer"
          >
            New User Registration
          </button>
        </div>

        <div>
          {/* Login / Reset Password Form Card */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            {mode === 'login' ? (
              <>
                <div className="border-b border-slate-200 pb-4">
                  <h1 className="font-display text-2xl font-bold text-[#0F2942]">
                    Portal Login · पोर्टल लॉगिन
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    Select your Login Type and enter your assigned User ID and Password.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-700">
                      Login Type (लॉगिन प्रकार) *
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginType('COURT');
                          setError('');
                        }}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-md border px-3 py-3 text-xs font-semibold transition-colors cursor-pointer ${
                          loginType === 'COURT'
                            ? 'border-[#0F2942] bg-[#0F2942] text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Building2 className="h-4 w-4" />
                        <span>COURT</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLoginType('PATWARI');
                          setError('');
                        }}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-md border px-3 py-3 text-xs font-semibold transition-colors cursor-pointer ${
                          loginType === 'PATWARI'
                            ? 'border-emerald-800 bg-emerald-800 text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <MapPin className="h-4 w-4" />
                        <span>PATWARI</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLoginType('ADMIN');
                          setError('');
                        }}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-md border px-3 py-3 text-xs font-semibold transition-colors cursor-pointer ${
                          loginType === 'ADMIN'
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>ADMIN</span>
                      </button>
                    </div>
                  </div>

                  {successMsg && (
                    <div className="flex items-start gap-2.5 rounded-md border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-900">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-start gap-2.5 rounded-md border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      User ID (उपयोगकर्ता आईडी) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        loginType === 'COURT'
                          ? 'e.g., COURT-SHD-001'
                          : loginType === 'PATWARI'
                          ? 'e.g., PATWARI-SHD-001'
                          : 'e.g., ADMIN-SHD-001'
                      }
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2.5 font-mono text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label className="block text-xs font-semibold text-slate-700">
                        Password (पासवर्ड) *
                      </label>
                      {loginType !== 'ADMIN' && (
                        <button
                          type="button"
                          onClick={openResetMode}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#C27803] hover:text-[#9A5B02] hover:underline cursor-pointer"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Forgot / Reset Password? (पासवर्ड रीसेट)</span>
                        </button>
                      )}
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0F2942] px-6 py-3 text-sm font-semibold text-white hover:bg-[#163859] disabled:opacity-60 cursor-pointer"
                  >
                    <KeyRound className="h-4 w-4" />
                    <span>{submitting ? 'Verifying Credentials...' : 'LOGIN'}</span>
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <h1 className="font-display text-2xl font-bold text-[#0F2942]">
                      Reset Password · पासवर्ड रीसेट
                    </h1>
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setMode('login');
                      }}
                      className="text-xs font-semibold text-slate-600 hover:text-[#0F2942] underline cursor-pointer"
                    >
                      Back to Login
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Verify your User ID and registered 10-digit mobile number to set a new password immediately.
                  </p>
                </div>

                <form onSubmit={handleResetSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-700">
                      Account Type (खाता प्रकार) *
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setResetRole('COURT');
                          setError('');
                        }}
                        className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                          resetRole === 'COURT'
                            ? 'border-[#0F2942] bg-[#0F2942] text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Building2 className="h-4 w-4" />
                        <span>COURT</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setResetRole('PATWARI');
                          setError('');
                        }}
                        className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                          resetRole === 'PATWARI'
                            ? 'border-emerald-800 bg-emerald-800 text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <MapPin className="h-4 w-4" />
                        <span>PATWARI</span>
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2.5 rounded-md border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        User ID (उपयोगकर्ता आईडी) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={resetRole === 'COURT' ? 'e.g., COURT-SHD-001' : 'e.g., PATWARI-SHD-001'}
                        value={resetUserId}
                        onChange={(e) => setResetUserId(e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2.5 font-mono text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Registered Mobile Number (पंजीकृत मोबाइल) *
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        value={resetPhone}
                        onChange={(e) => setResetPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full rounded-md border border-slate-300 px-3 py-2.5 font-mono text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        New Password (नया पासवर्ड) *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Minimum 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Confirm New Password (पुष्टि करें) *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Re-enter new password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-[#0F2942] px-6 py-3 text-sm font-semibold text-white hover:bg-[#163859] disabled:opacity-60 cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>{submitting ? 'Updating Password...' : 'RESET PASSWORD'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setMode('login');
                      }}
                      className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
