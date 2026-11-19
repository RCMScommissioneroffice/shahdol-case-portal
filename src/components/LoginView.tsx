import { ArrowLeft, Building2, KeyRound, MapPin, ShieldAlert, ShieldCheck } from 'lucide-react';
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

const DEMO_ACCOUNTS: Array<{ role: UserRole; userId: string; password: string; note: string }> = [
  { role: 'COURT', userId: 'COURT-SHD-001', password: 'Court@123', note: 'SDM Revenue Court, Sohagpur (Shahdol)' },
  { role: 'COURT', userId: 'COURT-SHD-002', password: 'Court@123', note: 'Tehsildar Court, Beohari (Shahdol)' },
  { role: 'PATWARI', userId: 'PATWARI-SHD-001', password: 'Patwari@123', note: 'Mahesh Tiwari · Kalyanpur (Shahdol)' },
  { role: 'PATWARI', userId: 'PATWARI-SHD-003', password: 'Patwari@123', note: 'Rajesh Patel · Nipaniya (Beohari)' },
  { role: 'ADMIN', userId: 'ADMIN-SHD-001', password: 'Admin@123', note: 'Shahdol Division Administrator' }
];

export function LoginView({
  defaultRole = 'COURT',
  prefillUserId = '',
  onBackHome,
  onGoRegister,
  onLoginSuccess
}: LoginViewProps) {
  const [loginType, setLoginType] = useState<UserRole>(defaultRole);
  const [userId, setUserId] = useState(prefillUserId);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
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

  function applyDemo(acc: (typeof DEMO_ACCOUNTS)[number]) {
    setLoginType(acc.role);
    setUserId(acc.userId);
    setPassword(acc.password);
    setError('');
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="h-1 w-full bg-gradient-to-r from-[#C27803] via-[#0B1F3A] to-[#047857]" />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Login Form Card */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 sm:p-8 lg:col-span-7">
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
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Password (पासवर्ड) *
                </label>
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
          </div>

          {/* Demo Accounts Helper */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 lg:col-span-5">
            <h2 className="font-display text-sm font-bold text-[#0F2942]">
              Division Demo Accounts (Quick Fill)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Click any credential below to test Court, Patwari, or Administrator portals immediately.
            </p>
            <div className="mt-4 space-y-2.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.userId}
                  type="button"
                  onClick={() => applyDemo(acc)}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 p-3 text-left hover:border-[#0F2942] hover:bg-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-[#0F2942]">{acc.userId}</span>
                    <span className="text-[11px] font-medium text-slate-500">{acc.role}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-700">{acc.note}</p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">Password: {acc.password}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
