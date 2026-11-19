import { ArrowRight, Building2, CheckCircle2, FileText, MapPin, ShieldCheck, UserPlus } from 'lucide-react';
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

      {/* Three-Zone Top Bar */}
      <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="font-display text-lg font-bold tracking-tight text-[#0B1F3A] whitespace-nowrap shrink-0 cursor-pointer"
          >
            SHAHDOL DIVISION
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#workflow" className="hover:text-[#0B1F3A] hover:underline underline-offset-4 whitespace-nowrap shrink-0">
              Workflow
            </a>
            <a href="#jurisdiction" className="hover:text-[#0B1F3A] hover:underline underline-offset-4 whitespace-nowrap shrink-0">
              Districts
            </a>
            <button
              type="button"
              onClick={() => onGoRegister()}
              className="hover:text-[#0B1F3A] hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Registration
            </button>
            <button
              type="button"
              onClick={() => onGoLogin('ADMIN')}
              className="hover:text-[#0B1F3A] hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Admin Portal
            </button>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => onGoLogin('COURT')}
              className="rounded-md bg-[#0B1F3A] px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[#14335C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Login
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="border-b border-slate-200 bg-gradient-to-br from-white via-[#FAF9F5] to-[#EEF3F9]">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:py-16">
            <div className="flex flex-col justify-center lg:col-span-7">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-amber-200/80 bg-white p-1 shadow-xs">
                  {!sealError ? (
                    <img
                      src="/assets/aistudio/images__1__a180929b.jpg"
                      alt="Government of Madhya Pradesh Official Emblem"
                      referrerPolicy="no-referrer"
                      onError={() => setSealError(true)}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ShieldCheck className="h-8 w-8 text-[#0B1F3A]" />
                  )}
                </div>
                <div className="text-xs font-medium text-slate-600">
                  <span className="font-semibold text-[#9A5B02]">Government of Madhya Pradesh</span>
                  <span aria-hidden="true" className="mx-2 text-slate-300">·</span>
                  <span>Revenue Court &amp; Patwari Coordination Portal</span>
                </div>
              </div>

              <h1 className="font-display text-3xl font-bold tracking-tight text-[#0B1F3A] sm:text-5xl text-balance">
                SHAHDOL DIVISION
              </h1>
              <p className="mt-3 text-lg font-semibold text-[#1E3A5F] sm:text-xl">
                Online Court–Patwari Case Reporting &amp; Response System
              </p>
              <p className="mt-1.5 text-sm font-medium text-[#9A5B02]">
                संभाग शहडोल — राजस्व न्यायालय एवं पटवारी ऑनलाइन प्रकरण प्रतिवेदन प्रणाली
              </p>

              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600">
                A unified digital reporting channel connecting Revenue Courts (Commissioner, Collector, SDM, Tehsildar &amp; Naib Tehsildar Courts) with village Patwaris across Shahdol, Umaria, and Anuppur districts. Automated District → Tehsil → Village routing ensures verified field reports, document tracking, and complete revenue court audit history.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => onGoLogin('COURT')}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-md bg-[#0B1F3A] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#14335C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>LOGIN</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onGoRegister()}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-md border border-[#0B1F3A]/25 bg-white px-6 py-3 text-sm font-semibold text-[#0B1F3A] shadow-xs hover:border-[#0B1F3A] hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4 text-[#9A5B02]" />
                  <span>NEW USER REGISTRATION</span>
                </button>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
                <span>Role-Based Access Control</span>
                <span aria-hidden="true">·</span>
                <span>District → Tehsil → Village Mapping</span>
                <span aria-hidden="true">·</span>
                <span>Versioned Report History</span>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="h-full min-h-[320px] overflow-hidden rounded-xl border border-amber-200/70 bg-white p-2 shadow-sm">
                <div className="h-full overflow-hidden rounded-lg bg-slate-100">
                  {!bannerError ? (
                    <img
                      src="/assets/aistudio/images__2__048b91b1.jpg"
                      alt="Government of Madhya Pradesh Leadership"
                      referrerPolicy="no-referrer"
                      onError={() => setBannerError(true)}
                      className="h-full max-h-[440px] w-full object-cover object-top"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-500">
                      <Building2 className="h-12 w-12 text-[#0B1F3A]" />
                      <p className="mt-3 text-sm font-medium text-slate-700">
                        Government of Madhya Pradesh — Revenue Administration
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow Overview */}
        <section id="workflow" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold text-[#0B1F3A]">
              End-to-End Case Reporting Workflow
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Structured communication from Revenue Court Order to Field Verification and Official Record Acceptance
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs transition-colors hover:border-[#0B1F3A]/35">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-[#EEF3F9] text-[#0B1F3A]">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-semibold text-[#0B1F3A]">
                01. Court Issues Report Request
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Revenue Court Presiding Officer selects District, Tehsil, and Village. The system automatically identifies the mapped Patwari and generates a unique Request ID.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs transition-colors hover:border-[#047857]/40">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-[#047857]">
                <MapPin className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-semibold text-[#0B1F3A]">
                02. Patwari Verifies &amp; Submits
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Only the concerned village Patwari receives the request, inspects site/revenue records, uploads supporting documents, and submits the report online.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs transition-colors hover:border-[#9A5B02]/40">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-amber-50 text-[#9A5B02]">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-semibold text-[#0B1F3A]">
                03. Court Reviews or Returns
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Court reviews the submitted report, accepts it to close the case, or returns it for correction while preserving every version in permanent audit history.
              </p>
            </div>
          </div>
        </section>

        {/* Divisional Jurisdiction Coverage */}
        <section id="jurisdiction" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
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
          <span>© 2026 Shahdol Division — Office of the Divisional Commissioner &amp; Revenue Courts</span>
          <div className="flex items-center gap-5">
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
