import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  KeyRound,
  MapPin,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import React, { useState } from 'react';

interface LandingPageProps {
  onGoLogin: (defaultRole?: 'COURT' | 'PATWARI' | 'ADMIN') => void;
  onGoRegister: (defaultType?: 'COURT' | 'PATWARI') => void;
}

export function LandingPage({ onGoLogin, onGoRegister }: LandingPageProps) {
  const [sealError, setSealError] = useState(false);
  const [bannerError, setBannerError] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-900">
      {/* Tricolor Civic Top Accent Rule */}
      <div className="h-1 w-full bg-gradient-to-r from-[#C27803] via-[#0B1F3A] to-[#047857]" />

      {/* Top Authority Bar */}
      <div className="bg-[#0B1F3A] text-slate-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-1.5 text-[11px] sm:px-6">
          <span className="font-medium tracking-wide">
            मध्य प्रदेश शासन · राजस्व विभाग (संभाग शहडोल)
          </span>
          <span className="font-mono text-amber-300/95">
            RCMS · SHAHDOL DIVISION PORTAL
          </span>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 text-left cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-amber-200/90 bg-white p-0.5 shadow-xs">
              {!sealError ? (
                <img
                  src="/assets/aistudio/images__1__a180929b.jpg"
                  alt="Government of Madhya Pradesh Official Emblem"
                  referrerPolicy="no-referrer"
                  onError={() => setSealError(true)}
                  className="h-full w-full object-contain"
                />
              ) : (
                <ShieldCheck className="h-6 w-6 text-[#0B1F3A]" />
              )}
            </div>
            <div>
              <span className="block font-display text-base font-bold tracking-tight text-[#0B1F3A] sm:text-lg">
                RCMS SHAHDOL DIVISION
              </span>
              <span className="block text-[11px] font-medium text-slate-500">
                Court &amp; Patwari Reporting System
              </span>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#portals"
              className="hover:text-[#0B1F3A] hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Portals
            </a>
            <a
              href="#workflow"
              className="hover:text-[#0B1F3A] hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Workflow
            </a>
            <a
              href="#jurisdiction"
              className="hover:text-[#0B1F3A] hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Districts
            </a>
            <button
              type="button"
              onClick={() => onGoLogin('ADMIN')}
              className="hover:text-[#0B1F3A] hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Admin Portal
            </button>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onGoRegister()}
              className="hidden sm:inline-flex rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#0B1F3A] hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => onGoLogin('COURT')}
              className="rounded-md bg-[#0B1F3A] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#14335C] transition-colors whitespace-nowrap shrink-0 cursor-pointer sm:text-sm"
            >
              Login
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="border-b border-slate-200 bg-gradient-to-br from-white via-[#FAF9F5] to-[#EAEFF6]">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:py-14">
            <div className="flex flex-col justify-center lg:col-span-7">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-md border border-amber-200/80 bg-amber-50/70 px-3 py-1.5 text-xs font-semibold text-[#9A5B02]">
                <span>Welcome to RCMS Shahdol Division</span>
                <span aria-hidden="true" className="text-amber-400">·</span>
                <span>Government of Madhya Pradesh</span>
              </div>

              <h1 className="font-display text-3xl font-bold tracking-tight text-[#0B1F3A] sm:text-5xl text-balance">
                SHAHDOL DIVISION
              </h1>
              <p className="mt-2.5 text-lg font-semibold text-[#16385F] sm:text-2xl">
                Online Court–Patwari Case Reporting &amp; Response System
              </p>
              <p className="mt-1.5 text-sm font-semibold text-[#9A5B02] sm:text-base">
                संभाग शहडोल — राजस्व न्यायालय एवं पटवारी ऑनलाइन प्रकरण प्रतिवेदन प्रणाली
              </p>

              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                A unified official reporting channel connecting Revenue Courts (Commissioner, Collector, SDM, Tehsildar &amp; Naib Tehsildar Courts) with village Patwaris across Shahdol, Umaria, and Anuppur districts. Automated District → Tehsil → Village routing delivers verified field reports, attachments, and complete case audit history.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => onGoLogin('COURT')}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-md bg-[#0B1F3A] px-7 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#14335C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <KeyRound className="h-4 w-4 text-amber-300" />
                  <span>LOGIN</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onGoRegister()}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-md border border-[#0B1F3A]/25 bg-white px-7 py-3 text-sm font-semibold text-[#0B1F3A] shadow-xs hover:border-[#0B1F3A] hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4 text-[#9A5B02]" />
                  <span>NEW USER REGISTRATION</span>
                </button>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200/80 pt-5 text-xs font-medium text-slate-600">
                <span>Role-Based Access Control</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>District → Tehsil → Village Mapping</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>Versioned Report History</span>
              </div>
            </div>

            {/* Right Portrait Frame: Uncropped on Mobile & Desktop */}
            <div className="lg:col-span-5">
              <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-xl border border-amber-200/90 bg-white p-2.5 shadow-md lg:max-w-[390px] lg:ml-auto lg:mr-0">
                <div className="overflow-hidden rounded-lg bg-slate-100">
                  {!bannerError ? (
                    <img
                      src="/assets/aistudio/images__2__048b91b1.jpg"
                      alt="डॉ. मोहन यादव, मुख्यमंत्री, मध्य प्रदेश"
                      referrerPolicy="no-referrer"
                      onError={() => setBannerError(true)}
                      className="block h-auto w-full object-contain"
                    />
                  ) : (
                    <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center text-slate-500">
                      <Building2 className="h-12 w-12 text-[#0B1F3A]" />
                      <p className="mt-3 text-sm font-medium text-slate-700">
                        डॉ. मोहन यादव · मुख्यमंत्री, मध्य प्रदेश
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-2 rounded-md bg-[#0B1F3A] px-3 py-2.5 text-center">
                  <p className="text-sm font-bold text-white">
                    डॉ. मोहन यादव
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-amber-300/95">
                    मुख्यमंत्री, मध्य प्रदेश
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Three Dedicated Official Portals */}
        <section id="portals" className="mx-auto max-w-6xl px-4 pt-12 pb-4 sm:px-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="flex flex-col justify-between rounded-lg border border-slate-200 border-t-2 border-t-[#0B1F3A] bg-white p-6 shadow-xs">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#EEF3F9] text-[#0B1F3A]">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-[#0B1F3A]">Revenue Court Portal</h2>
                    <p className="text-[11px] font-medium text-slate-500">न्यायालय पोर्टल</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">
                  Create online report requests routed to the concerned village Patwari, inspect submitted reports, accept or return for correction.
                </p>
              </div>
              <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => onGoLogin('COURT')}
                  className="text-[#0B1F3A] hover:underline cursor-pointer"
                >
                  Court Login →
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => onGoRegister('COURT')}
                  className="text-[#9A5B02] hover:underline cursor-pointer"
                >
                  Register Court
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-lg border border-slate-200 border-t-2 border-t-[#047857] bg-white p-6 shadow-xs">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-[#047857]">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-[#0B1F3A]">Patwari Officer Portal</h2>
                    <p className="text-[11px] font-medium text-slate-500">पटवारी पोर्टल</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">
                  Receive jurisdiction-specific court orders, enter field inspection findings, attach documents, and submit versioned reports online.
                </p>
              </div>
              <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => onGoLogin('PATWARI')}
                  className="text-[#047857] hover:underline cursor-pointer"
                >
                  Patwari Login →
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => onGoRegister('PATWARI')}
                  className="text-[#9A5B02] hover:underline cursor-pointer"
                >
                  Register Patwari
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-lg border border-slate-200 border-t-2 border-t-[#C27803] bg-white p-6 shadow-xs">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-50 text-[#9A5B02]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-[#0B1F3A]">Divisional Administrator</h2>
                    <p className="text-[11px] font-medium text-slate-500">संभागीय प्रशासक पोर्टल</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">
                  Monitor division-wide pending &amp; completed reports, manage Tehsil/Village mappings, user accounts, password resets, and audit logs.
                </p>
              </div>
              <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => onGoLogin('ADMIN')}
                  className="text-[#0B1F3A] hover:underline cursor-pointer"
                >
                  Admin Login →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow Overview */}
        <section id="workflow" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="mb-7">
            <h2 className="font-display text-2xl font-bold text-[#0B1F3A]">
              End-to-End Case Reporting Workflow
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Structured communication from Revenue Court Order to Field Verification and Official Record Acceptance
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs transition-colors hover:border-[#0B1F3A]/35">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#EEF3F9] text-[#0B1F3A]">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="font-mono text-xs font-bold text-slate-400">STEP 01</span>
              </div>
              <h3 className="font-display text-base font-semibold text-[#0B1F3A]">
                Court Issues Report Request
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Revenue Court Presiding Officer selects District, Tehsil, and Village. The system automatically identifies the mapped Patwari and generates a unique Request ID.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs transition-colors hover:border-[#047857]/40">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-[#047857]">
                  <MapPin className="h-5 w-5" />
                </div>
                <span className="font-mono text-xs font-bold text-slate-400">STEP 02</span>
              </div>
              <h3 className="font-display text-base font-semibold text-[#0B1F3A]">
                Patwari Verifies &amp; Submits
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Only the concerned village Patwari receives the request, inspects site/revenue records, uploads supporting documents, and submits the report online.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs transition-colors hover:border-[#9A5B02]/40">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-50 text-[#9A5B02]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <span className="font-mono text-xs font-bold text-slate-400">STEP 03</span>
              </div>
              <h3 className="font-display text-base font-semibold text-[#0B1F3A]">
                Court Reviews or Returns
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Court reviews the submitted report, accepts it to close the case, or returns it for correction while preserving every version in permanent audit history.
              </p>
            </div>
          </div>
        </section>

        {/* Divisional Jurisdiction Coverage */}
        <section id="jurisdiction" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-5">
                <h2 className="font-display text-2xl font-bold text-[#0B1F3A]">
                  Divisional Coverage
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Covering all Revenue Courts, Tehsils, and Patwari Halkas across the three districts of Shahdol Division, Madhya Pradesh.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-7">
                {[
                  { name: 'Shahdol', code: 'SHD', tehsils: 'Sohagpur, Beohari, Burhar, Jaisinghnagar, Jaitpur, Gohparu', accent: 'bg-[#EEF3F9]/60 border-[#0B1F3A]/15' },
                  { name: 'Umaria', code: 'UMR', tehsils: 'Bandhavgarh, Pali, Manpur, Chandia, Nowrozabad', accent: 'bg-[#FAF7F0] border-amber-200/80' },
                  { name: 'Anuppur', code: 'ANP', tehsils: 'Anuppur, Kotma, Pushprajgarh, Jaithari', accent: 'bg-emerald-50/50 border-emerald-200/80' }
                ].map((d) => (
                  <div key={d.code} className={`rounded-lg border p-4 ${d.accent}`}>
                    <div className="flex items-baseline justify-between">
                      <h3 className="font-display text-base font-semibold text-[#0B1F3A]">{d.name}</h3>
                      <span className="font-mono text-xs font-semibold text-slate-500">{d.code}</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{d.tehsils}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-[#0B1F3A] py-6 text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 text-xs sm:flex-row sm:items-center sm:px-6">
          <span>© 2026 RCMS Shahdol Division — Office of the Divisional Commissioner &amp; Revenue Courts</span>
          <div className="flex flex-wrap items-center gap-5">
            <button type="button" onClick={() => onGoLogin('COURT')} className="hover:text-white cursor-pointer">
              Court Login
            </button>
            <button type="button" onClick={() => onGoLogin('PATWARI')} className="hover:text-white cursor-pointer">
              Patwari Login
            </button>
            <button type="button" onClick={() => onGoLogin('ADMIN')} className="hover:text-white cursor-pointer">
              Administrator Login
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
