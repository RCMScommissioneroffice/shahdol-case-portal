import { ArrowLeft, Building2, CheckCircle2, MapPin, ShieldAlert } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import type { DistrictItem, TehsilItem } from '../types';

interface RegistrationViewProps {
  initialType?: 'COURT' | 'PATWARI' | null;
  onBackHome: () => void;
  onProceedToLogin: (role: 'COURT' | 'PATWARI', prefillUserId?: string) => void;
}

export function RegistrationView({
  initialType = null,
  onBackHome,
  onProceedToLogin
}: RegistrationViewProps) {
  const [regType, setRegType] = useState<'COURT' | 'PATWARI' | null>(initialType);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [tehsils, setTehsils] = useState<TehsilItem[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  // Court fields
  const [cDistrictId, setCDistrictId] = useState('');
  const [cTehsilId, setCTehsilId] = useState('');
  const [courtName, setCourtName] = useState('');
  const [poName, setPoName] = useState('');
  const [poPhone, setPoPhone] = useState('');
  const [cPassword, setCPassword] = useState('');
  const [cConfirmPassword, setCConfirmPassword] = useState('');

  // Patwari fields
  const [pDistrictId, setPDistrictId] = useState('');
  const [pTehsilId, setPTehsilId] = useState('');
  const [pVillageName, setPVillageName] = useState('');
  const [patwariName, setPatwariName] = useState('');
  const [patwariPhone, setPatwariPhone] = useState('');
  const [pPassword, setPPassword] = useState('');
  const [pConfirmPassword, setPConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState<{
    role: 'COURT' | 'PATWARI';
    userId: string;
    summary: string;
  } | null>(null);

  useEffect(() => {
    setLoadingLocations(true);
    apiRequest<{ districts: DistrictItem[]; tehsils: TehsilItem[] }>('/api/locations')
      .then((data) => {
        setDistricts(data.districts);
        setTehsils(data.tehsils);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingLocations(false));
  }, []);

  const courtTehsils = tehsils.filter((t) => String(t.district_id) === cDistrictId);
  const patwariTehsils = tehsils.filter((t) => String(t.district_id) === pDistrictId);

  async function handleCourtSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await apiRequest<{
        userId: string;
        courtName: string;
        districtName: string;
        tehsilName: string;
      }>('/api/auth/register-court', {
        method: 'POST',
        body: JSON.stringify({
          districtId: Number(cDistrictId),
          tehsilId: Number(cTehsilId),
          courtName,
          poName,
          poPhone,
          password: cPassword,
          confirmPassword: cConfirmPassword
        })
      });
      setSuccessInfo({
        role: 'COURT',
        userId: res.userId,
        summary: `${res.courtName} (${res.tehsilName}, ${res.districtName})`
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePatwariSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await apiRequest<{
        userId: string;
        patwariName: string;
        districtName: string;
        tehsilName: string;
        villageName: string;
      }>('/api/auth/register-patwari', {
        method: 'POST',
        body: JSON.stringify({
          districtId: Number(pDistrictId),
          tehsilId: Number(pTehsilId),
          villageName: pVillageName.trim(),
          patwariName,
          patwariPhone,
          password: pPassword,
          confirmPassword: pConfirmPassword
        })
      });
      setSuccessInfo({
        role: 'PATWARI',
        userId: res.userId,
        summary: `${res.patwariName} — Village ${res.villageName}, ${res.tehsilName}, ${res.districtName}`
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="h-1 w-full bg-gradient-to-r from-[#C27803] via-[#0B1F3A] to-[#047857]" />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#0F2942] cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shahdol Division Home
          </button>
          <span className="font-mono text-xs text-slate-500">NEW USER REGISTRATION</span>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 sm:p-8">
          <div className="border-b border-slate-200 pb-5">
            <h1 className="font-display text-2xl font-bold text-[#0F2942]">
              New User Registration · नवीन उपयोगकर्ता पंजीकरण
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Select your official office role to generate a unique Division User ID.
            </p>
          </div>

          {successInfo ? (
            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
                <div className="w-full">
                  <h2 className="font-display text-lg font-bold text-emerald-900">
                    Registration Successful
                  </h2>
                  <p className="mt-1 text-sm text-emerald-800">{successInfo.summary}</p>
                  <div className="mt-4 rounded-md border border-emerald-300 bg-white p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Your Generated {successInfo.role === 'COURT' ? 'Court' : 'Patwari'} User ID (Save for Login)
                    </p>
                    <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-[#0F2942]">
                      {successInfo.userId}
                    </p>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => onProceedToLogin(successInfo.role, successInfo.userId)}
                      className="rounded-md bg-[#0F2942] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#163859] cursor-pointer"
                    >
                      Proceed to Login with {successInfo.userId}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSuccessInfo(null);
                        setRegType(null);
                      }}
                      className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Register Another User
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Option Selector */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setRegType('COURT');
                    setError('');
                  }}
                  className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors cursor-pointer ${
                    regType === 'COURT'
                      ? 'border-[#0F2942] bg-slate-50 ring-1 ring-[#0F2942]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#0F2942] text-white">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold text-slate-900">
                      Option 1: COURT REGISTRATION
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      Revenue Courts (राजस्व न्यायालय पंजीकरण)
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRegType('PATWARI');
                    setError('');
                  }}
                  className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors cursor-pointer ${
                    regType === 'PATWARI'
                      ? 'border-[#0F2942] bg-slate-50 ring-1 ring-[#0F2942]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-800 text-white">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold text-slate-900">
                      Option 2: PATWARI REGISTRATION
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      Village Revenue Officer (पटवारी पंजीकरण)
                    </p>
                  </div>
                </button>
              </div>

              {error && (
                <div className="mt-5 flex items-start gap-2.5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {loadingLocations ? (
                <div className="mt-8 text-sm text-slate-500">Loading division districts and tehsils...</div>
              ) : regType === 'COURT' ? (
                <form onSubmit={handleCourtSubmit} className="mt-6 space-y-5">
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    Court Details · न्यायालय विवरण
                  </h2>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        District (जिला) *
                      </label>
                      <select
                        required
                        value={cDistrictId}
                        onChange={(e) => {
                          setCDistrictId(e.target.value);
                          setCTehsilId('');
                        }}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                      >
                        <option value="">-- Select District --</option>
                        {districts.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.district_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Tehsil (तहसील) *
                      </label>
                      <select
                        required
                        disabled={!cDistrictId}
                        value={cTehsilId}
                        onChange={(e) => setCTehsilId(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 disabled:bg-slate-100 focus:border-[#0F2942] focus:outline-none"
                      >
                        <option value="">-- Select Tehsil --</option>
                        {courtTehsils.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.tehsil_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Court Name (न्यायालय का नाम) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., SDM Revenue Court, Sohagpur"
                      value={courtName}
                      onChange={(e) => setCourtName(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        PO Name / Presiding Officer (पीठासीन अधिकारी) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Full name of Presiding Officer"
                        value={poName}
                        onChange={(e) => setPoName(e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        PO Phone Number (मोबाइल नंबर - 10 अंक) *
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="e.g., 9826100001"
                        value={poPhone}
                        onChange={(e) => setPoPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full rounded-md border border-slate-300 px-3 py-2.5 font-mono text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Create Password (पासवर्ड बनाएं) *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Minimum 6 characters"
                        value={cPassword}
                        onChange={(e) => setCPassword(e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Confirm Password (पासवर्ड की पुष्टि करें) *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Re-enter password"
                        value={cConfirmPassword}
                        onChange={(e) => setCConfirmPassword(e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-md bg-[#0F2942] px-6 py-3 text-sm font-semibold text-white hover:bg-[#163859] disabled:opacity-60 cursor-pointer"
                    >
                      {submitting ? 'Registering Court...' : 'REGISTER COURT'}
                    </button>
                  </div>
                </form>
              ) : regType === 'PATWARI' ? (
                <form onSubmit={handlePatwariSubmit} className="mt-6 space-y-5">
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    Patwari Details · पटवारी विवरण
                  </h2>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        District (जिला) *
                      </label>
                      <select
                        required
                        value={pDistrictId}
                        onChange={(e) => {
                          setPDistrictId(e.target.value);
                          setPTehsilId('');
                          setPVillageName('');
                        }}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                      >
                        <option value="">-- District --</option>
                        {districts.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.district_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Tehsil (तहसील) *
                      </label>
                      <select
                        required
                        disabled={!pDistrictId}
                        value={pTehsilId}
                        onChange={(e) => {
                          setPTehsilId(e.target.value);
                          setPVillageName('');
                        }}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 disabled:bg-slate-100 focus:border-[#0F2942] focus:outline-none"
                      >
                        <option value="">-- Tehsil --</option>
                        {patwariTehsils.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.tehsil_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Village / Halka (ग्राम / हल्का) *
                      </label>
                      <input
                        type="text"
                        required
                        disabled={!pTehsilId}
                        placeholder={pTehsilId ? 'Enter Village name' : 'Select Tehsil first'}
                        value={pVillageName}
                        onChange={(e) => setPVillageName(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 disabled:bg-slate-100 focus:border-[#0F2942] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Patwari Name (पटवारी का नाम) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Full name of Patwari"
                        value={patwariName}
                        onChange={(e) => setPatwariName(e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Patwari Phone Number (मोबाइल नंबर - 10 अंक) *
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="e.g., 9826200001"
                        value={patwariPhone}
                        onChange={(e) => setPatwariPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full rounded-md border border-slate-300 px-3 py-2.5 font-mono text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Create Password (पासवर्ड बनाएं) *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Minimum 6 characters"
                        value={pPassword}
                        onChange={(e) => setPPassword(e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Confirm Password (पासवर्ड की पुष्टि करें) *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Re-enter password"
                        value={pConfirmPassword}
                        onChange={(e) => setPConfirmPassword(e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-md bg-emerald-800 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60 cursor-pointer"
                    >
                      {submitting ? 'Registering Patwari...' : 'REGISTER PATWARI'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-6 rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
                  Please choose either <strong>COURT REGISTRATION</strong> or <strong>PATWARI REGISTRATION</strong> above to open the registration form.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
