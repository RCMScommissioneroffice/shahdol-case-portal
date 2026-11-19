import {
  CheckCircle2,
  ClipboardList,
  Download,
  FileCheck2,
  FilePlus2,
  History,
  LayoutDashboard,
  Paperclip,
  RotateCcw,
  ShieldAlert,
  UserCircle2,
  X
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest, withAuthToken } from '../api';
import type {
  AttachmentMeta,
  AuthUser,
  CaseRequestItem,
  DistrictItem,
  NotificationItem,
  PatwariReportItem,
  ReportHistoryItem,
  TehsilItem,
  VillageItem
} from '../types';
import { DashboardShell, type NavItem } from './DashboardShell';
import { StatusIndicator, formatDateTime, formatTimestamp } from './StatusBadge';

interface CourtDashboardProps {
  user: AuthUser;
  bilingual: boolean;
  onToggleBilingual: () => void;
  onLogout: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkNotificationRead: (id: number) => void;
  onMarkAllRead: () => void;
  onRefreshNotifications: () => void;
}

export function CourtDashboard({
  user,
  bilingual,
  onToggleBilingual,
  onLogout,
  notifications,
  unreadCount,
  onMarkNotificationRead,
  onMarkAllRead,
  onRefreshNotifications
}: CourtDashboardProps) {
  const court = user.courtProfile!;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [requests, setRequests] = useState<CaseRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tableSearch, setTableSearch] = useState('');

  // Locations for New Request form
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [tehsils, setTehsils] = useState<TehsilItem[]>([]);
  const [villages, setVillages] = useState<VillageItem[]>([]);

  // New Request form state
  const [reqDistrictId, setReqDistrictId] = useState(String(court.district_id));
  const [reqTehsilId, setReqTehsilId] = useState(String(court.tehsil_id));
  const [reqVillageId, setReqVillageId] = useState('');
  const [mappedPatwari, setMappedPatwari] = useState<{
    id: number;
    user_id: string;
    patwari_name: string;
    patwari_phone: string;
  } | null>(null);
  const [patwariLookupError, setPatwariLookupError] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [caseDetails, setCaseDetails] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdBanner, setCreatedBanner] = useState<{ requestId: string; patwariName: string } | null>(null);

  // Detail / View Report state
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<{
    request: CaseRequestItem;
    reports: PatwariReportItem[];
    history: ReportHistoryItem[];
  } | null>(null);
  const [selectedVersionIdx, setSelectedVersionIdx] = useState(0);
  const [showReturnBox, setShowReturnBox] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');

  const [loadError, setLoadError] = useState('');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await apiRequest<{ requests: CaseRequestItem[] }>('/api/court/requests');
      setRequests(res.requests);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests().catch(() => {});
    apiRequest<{ districts: DistrictItem[]; tehsils: TehsilItem[]; villages: VillageItem[] }>('/api/locations')
      .then((loc) => {
        setDistricts(loc.districts);
        setTehsils(loc.tehsils);
        setVillages(loc.villages);
      })
      .catch(() => {});
  }, [loadRequests]);

  // Auto-lookup mapped Patwari when village changes
  useEffect(() => {
    if (!reqVillageId) {
      setMappedPatwari(null);
      setPatwariLookupError('');
      return;
    }
    setPatwariLookupError('');
    apiRequest<{ patwari: { id: number; user_id: string; patwari_name: string; patwari_phone: string } }>(
      `/api/court/patwari-by-village/${reqVillageId}`
    )
      .then((res) => {
        setMappedPatwari(res.patwari);
        setPatwariLookupError('');
      })
      .catch((err) => {
        setMappedPatwari(null);
        setPatwariLookupError(err.message);
      });
  }, [reqVillageId]);

  async function openCaseDetail(requestId: string) {
    setSelectedRequestId(requestId);
    setDetailLoading(true);
    setShowReturnBox(false);
    setCorrectionReason('');
    setActionMsg('');
    setActionError('');
    setSelectedVersionIdx(0);
    try {
      const res = await apiRequest<{
        request: CaseRequestItem;
        reports: PatwariReportItem[];
        history: ReportHistoryItem[];
      }>(`/api/court/requests/${encodeURIComponent(requestId)}`);
      setDetailData(res);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not load request details.');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleCreateRequest(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreatedBanner(null);
    setCreating(true);
    try {
      const res = await apiRequest<{
        requestId: string;
        mappedPatwari: { patwari_name: string };
      }>('/api/court/requests', {
        method: 'POST',
        body: JSON.stringify({
          districtId: Number(reqDistrictId),
          tehsilId: Number(reqTehsilId),
          villageId: Number(reqVillageId),
          caseNumber,
          caseDetails,
          additionalInstructions
        })
      });
      setCreatedBanner({
        requestId: res.requestId,
        patwariName: res.mappedPatwari.patwari_name
      });
      setCaseNumber('');
      setCaseDetails('');
      setAdditionalInstructions('');
      setReqVillageId('');
      setMappedPatwari(null);
      await loadRequests();
      onRefreshNotifications();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create report request.');
    } finally {
      setCreating(false);
    }
  }

  async function handleAcceptReport() {
    if (!detailData) return;
    setActionBusy(true);
    setActionError('');
    try {
      const res = await apiRequest<{ message: string }>(
        `/api/court/requests/${encodeURIComponent(detailData.request.request_id)}/accept`,
        { method: 'POST', body: JSON.stringify({}) }
      );
      setActionMsg(res.message);
      await openCaseDetail(detailData.request.request_id);
      await loadRequests();
      onRefreshNotifications();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to accept report.');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleReturnForCorrection(e: React.FormEvent) {
    e.preventDefault();
    if (!detailData) return;
    setActionBusy(true);
    setActionError('');
    try {
      const res = await apiRequest<{ message: string }>(
        `/api/court/requests/${encodeURIComponent(detailData.request.request_id)}/return`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: correctionReason })
        }
      );
      setActionMsg(res.message);
      setShowReturnBox(false);
      setCorrectionReason('');
      await openCaseDetail(detailData.request.request_id);
      await loadRequests();
      onRefreshNotifications();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to return report.');
    } finally {
      setActionBusy(false);
    }
  }

  const totalCount = requests.length;
  const pendingCount = requests.filter((r) =>
    ['Pending', 'Viewed by Patwari', 'Report in Progress', 'Returned for Correction'].includes(r.status)
  ).length;
  const submittedCount = requests.filter((r) =>
    ['Report Submitted', 'Report Resubmitted'].includes(r.status)
  ).length;
  const closedCount = requests.filter((r) => r.status === 'Closed').length;

  const filteredTehsils = tehsils.filter((t) => String(t.district_id) === reqDistrictId);
  const filteredVillages = villages.filter(
    (v) => String(v.district_id) === reqDistrictId && String(v.tehsil_id) === reqTehsilId
  );

  const visibleRequests = requests.filter((r) => {
    if (activeTab === 'reports' && !['Report Submitted', 'Report Resubmitted', 'Closed'].includes(r.status)) {
      return false;
    }
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      return (
        r.request_id.toLowerCase().includes(q) ||
        r.case_number.toLowerCase().includes(q) ||
        r.village_name.toLowerCase().includes(q) ||
        (r.patwari_name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', labelHi: 'डैशबोर्ड', icon: LayoutDashboard },
    { id: 'new-request', label: 'New Request', labelHi: 'नया अनुरोध', icon: FilePlus2 },
    { id: 'my-requests', label: 'My Requests', labelHi: 'मेरे अनुरोध', icon: ClipboardList },
    {
      id: 'reports',
      label: 'Reports Received',
      labelHi: 'प्राप्त प्रतिवेदन',
      icon: FileCheck2,
      badge: submittedCount
    },
    { id: 'profile', label: 'Profile', labelHi: 'प्रोफ़ाइल', icon: UserCircle2 }
  ];

  const activeReport =
    detailData && detailData.reports.length > 0
      ? detailData.reports[selectedVersionIdx] || detailData.reports[0]
      : null;

  let parsedAttachments: AttachmentMeta[] = [];
  if (activeReport?.attachments_json) {
    try {
      parsedAttachments = JSON.parse(activeReport.attachments_json);
    } catch {
      parsedAttachments = [];
    }
  }

  return (
    <DashboardShell
      user={user}
      title={bilingual ? 'Shahdol Division – Court Dashboard · न्यायालय डैशबोर्ड' : 'Shahdol Division – Court Dashboard'}
      subtitle={`${court.court_name} · PO: ${court.po_name} · ${court.tehsil_name}, ${court.district_name}`}
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={onLogout}
      bilingual={bilingual}
      onToggleBilingual={onToggleBilingual}
      onOpenRequest={openCaseDetail}
      unreadCount={unreadCount}
      notifications={notifications}
      onMarkNotificationRead={onMarkNotificationRead}
      onMarkAllRead={onMarkAllRead}
    >
      {/* Court Profile Banner & Quick CTA */}
      <div className="mb-6 flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs sm:grid-cols-4">
          <div>
            <p className="text-slate-500">District · जिला</p>
            <p className="mt-0.5 font-semibold text-slate-900">{court.district_name}</p>
          </div>
          <div>
            <p className="text-slate-500">Tehsil · तहसील</p>
            <p className="mt-0.5 font-semibold text-slate-900">{court.tehsil_name}</p>
          </div>
          <div>
            <p className="text-slate-500">Court Name</p>
            <p className="mt-0.5 font-semibold text-slate-900">{court.court_name}</p>
          </div>
          <div>
            <p className="text-slate-500">PO Name</p>
            <p className="mt-0.5 font-semibold text-slate-900">{court.po_name}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreatedBanner(null);
            setActiveTab('new-request');
          }}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0F2942] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#163859] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FilePlus2 className="h-4 w-4" />
          <span>+ NEW PATWARI REPORT REQUEST</span>
        </button>
      </div>

      {activeTab === 'new-request' ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="font-display text-lg font-bold text-[#0F2942]">
              Create New Patwari Report Request {bilingual ? '· नया पटवारी प्रतिवेदन अनुरोध' : ''}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Select District, Tehsil, and Village. The system automatically routes this request exclusively to the mapped village Patwari.
            </p>
          </div>

          {createdBanner && (
            <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    Report Request Dispatched Successfully
                  </p>
                  <p className="mt-1 text-xs text-emerald-800">
                    Request ID: <span className="font-mono font-bold">{createdBanner.requestId}</span> · Assigned to Patwari{' '}
                    <strong>{createdBanner.patwariName}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('my-requests')}
                    className="mt-2 text-xs font-semibold text-emerald-900 underline cursor-pointer"
                  >
                    View Request Status Table
                  </button>
                </div>
              </div>
            </div>
          )}

          {createError && (
            <div className="mt-5 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <form onSubmit={handleCreateRequest} className="mt-6 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  District (जिला) *
                </label>
                <select
                  required
                  value={reqDistrictId}
                  onChange={(e) => {
                    setReqDistrictId(e.target.value);
                    setReqTehsilId('');
                    setReqVillageId('');
                    setMappedPatwari(null);
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                >
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
                  value={reqTehsilId}
                  onChange={(e) => {
                    setReqTehsilId(e.target.value);
                    setReqVillageId('');
                    setMappedPatwari(null);
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                >
                  <option value="">-- Select Tehsil --</option>
                  {filteredTehsils.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tehsil_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Village Name (ग्राम) *
                </label>
                <select
                  required
                  disabled={!reqTehsilId}
                  value={reqVillageId}
                  onChange={(e) => setReqVillageId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 disabled:bg-slate-100 focus:border-[#0F2942] focus:outline-none"
                >
                  <option value="">-- Select Village --</option>
                  {filteredVillages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.village_name} {v.has_patwari ? `(${v.mapped_patwari_name})` : '(No Patwari)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Court Name (न्यायालय)
                </label>
                <input
                  type="text"
                  readOnly
                  value={court.court_name}
                  className="w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-700"
                />
              </div>
            </div>

            {/* Auto-Mapped Patwari Display */}
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-700">
                Auto-Identified Village Patwari (स्वचालित पटवारी मैपिंग)
              </p>
              {patwariLookupError ? (
                <p className="mt-1.5 text-xs font-medium text-rose-700">{patwariLookupError}</p>
              ) : mappedPatwari ? (
                <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <span className="text-[11px] text-slate-500">Patwari Name</span>
                    <p className="text-sm font-semibold text-[#0F2942]">{mappedPatwari.patwari_name}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Patwari Phone Number</span>
                    <p className="font-mono text-sm font-semibold text-slate-900">{mappedPatwari.patwari_phone}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Patwari User ID</span>
                    <p className="font-mono text-sm text-slate-700">{mappedPatwari.user_id}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-xs text-slate-500">
                  Select a Village above to auto-populate the assigned Patwari Name and Phone Number.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Case Number (प्रकरण क्रमांक) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., CS/205/2026 or REV/41/2026"
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2.5 font-mono text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Case Details / Required Report Subject (प्रकरण विवरण) *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Describe Khasra number, area, party names, and exact verification required..."
                value={caseDetails}
                onChange={(e) => setCaseDetails(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Additional Instructions (अतिरिक्त निर्देश - Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Optional timeline, panchnama instructions, or specific revenue documents needed..."
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={creating || !mappedPatwari}
                className="rounded-md bg-[#0F2942] px-6 py-3 text-sm font-semibold text-white hover:bg-[#163859] disabled:opacity-50 cursor-pointer"
              >
                {creating ? 'Sending Request...' : 'SEND REPORT REQUEST TO PATWARI'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : activeTab === 'profile' ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="font-display text-lg font-bold text-[#0F2942]">Court Profile</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-md border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Court User ID</p>
              <p className="mt-1 font-mono font-semibold text-[#0F2942]">{user.userId}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Court Name</p>
              <p className="mt-1 font-semibold text-slate-900">{court.court_name}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Presiding Officer (PO)</p>
              <p className="mt-1 font-semibold text-slate-900">{court.po_name}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-4">
              <p className="text-xs text-slate-500">PO Phone Number</p>
              <p className="mt-1 font-mono font-semibold text-slate-900">{court.po_phone}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-4">
              <p className="text-xs text-slate-500">District &amp; Tehsil</p>
              <p className="mt-1 font-semibold text-slate-900">
                {court.tehsil_name}, {court.district_name}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {loadError && (
            <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{loadError}</span>
            </div>
          )}
          {/* KPI Strip on Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">Total Requests Sent</p>
                <p className="mt-2 font-mono text-2xl font-bold text-[#0F2942] tabular-nums">{totalCount}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">Pending with Patwari</p>
                <p className="mt-2 font-mono text-2xl font-bold text-amber-700 tabular-nums">{pendingCount}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">Awaiting Court Review</p>
                <p className="mt-2 font-mono text-2xl font-bold text-emerald-700 tabular-nums">{submittedCount}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">Accepted / Closed</p>
                <p className="mt-2 font-mono text-2xl font-bold text-slate-700 tabular-nums">{closedCount}</p>
              </div>
            </div>
          )}

          {/* Requests Table Section */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-display text-base font-bold text-[#0F2942]">
                  {activeTab === 'reports'
                    ? 'Patwari Reports Received'
                    : 'Case Report Requests Status'}
                </h2>
                <p className="text-xs text-slate-500">
                  Track status updates and open submitted Patwari reports for acceptance or correction.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  placeholder="Filter by Case No, Village..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-[#0F2942] focus:outline-none"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#0F2942] focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Viewed by Patwari">Viewed by Patwari</option>
                  <option value="Report in Progress">Report in Progress</option>
                  <option value="Report Submitted">Report Submitted</option>
                  <option value="Returned for Correction">Returned for Correction</option>
                  <option value="Report Resubmitted">Report Resubmitted</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading Court requests...</div>
            ) : visibleRequests.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-medium text-slate-700">No case report requests found.</p>
                <p className="mt-1 text-xs text-slate-500">
                  Create a new report request to automatically assign a village Patwari.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('new-request')}
                  className="mt-4 rounded-md bg-[#0F2942] px-4 py-2 text-xs font-semibold text-white hover:bg-[#163859] cursor-pointer"
                >
                  + Create First Report Request
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <th className="px-4 py-3 font-semibold">Request ID</th>
                        <th className="px-4 py-3 font-semibold">Case No.</th>
                        <th className="px-4 py-3 font-semibold">District</th>
                        <th className="px-4 py-3 font-semibold">Tehsil</th>
                        <th className="px-4 py-3 font-semibold">Village</th>
                        <th className="px-4 py-3 font-semibold">Patwari</th>
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleRequests.map((reqItem) => {
                        const hasReport = (reqItem.report_count ?? 0) > 0;
                        return (
                          <tr key={reqItem.request_id} className="hover:bg-slate-50/80">
                            <td className="px-4 py-3 font-mono font-semibold text-[#0F2942] whitespace-nowrap">
                              {reqItem.request_id}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-800 whitespace-nowrap">
                              {reqItem.case_number}
                            </td>
                            <td className="px-4 py-3 text-slate-700">{reqItem.district_name}</td>
                            <td className="px-4 py-3 text-slate-700">{reqItem.tehsil_name}</td>
                            <td className="px-4 py-3 font-medium text-slate-900">{reqItem.village_name}</td>
                            <td className="px-4 py-3 text-slate-700">{reqItem.patwari_name}</td>
                            <td className="px-4 py-3 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                              {formatDateTime(reqItem.created_at)}
                            </td>
                            <td className="px-4 py-3">
                              <StatusIndicator status={reqItem.status} bilingual={bilingual} />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => openCaseDetail(reqItem.request_id)}
                                className={`rounded px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer ${
                                  hasReport
                                    ? 'bg-[#0F2942] text-white hover:bg-[#163859]'
                                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {hasReport ? 'VIEW REPORT' : 'VIEW DETAILS'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="divide-y divide-slate-200 md:hidden">
                  {visibleRequests.map((reqItem) => {
                    const hasReport = (reqItem.report_count ?? 0) > 0;
                    return (
                      <div key={reqItem.request_id} className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-mono text-xs font-bold text-[#0F2942]">{reqItem.request_id}</p>
                            <p className="font-mono text-xs text-slate-600">Case: {reqItem.case_number}</p>
                          </div>
                          <StatusIndicator status={reqItem.status} />
                        </div>
                        <p className="text-xs text-slate-700">
                          {reqItem.village_name}, {reqItem.tehsil_name} ({reqItem.district_name}) · Patwari:{' '}
                          <strong>{reqItem.patwari_name}</strong>
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-mono text-[11px] text-slate-500">
                            {formatDateTime(reqItem.created_at)}
                          </span>
                          <button
                            type="button"
                            onClick={() => openCaseDetail(reqItem.request_id)}
                            className="rounded bg-[#0F2942] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                          >
                            {hasReport ? 'VIEW REPORT' : 'VIEW DETAILS'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Case Detail & Patwari Report Modal */}
      {selectedRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-6">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <p className="font-mono text-xs text-slate-500">COURT CASE INSPECTION</p>
                <h3 className="font-display text-lg font-bold text-[#0F2942]">
                  {selectedRequestId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedRequestId(null);
                  setDetailData(null);
                }}
                className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {detailLoading || !detailData ? (
              <div className="p-10 text-center text-sm text-slate-500">Loading case request and report...</div>
            ) : (
              <div className="space-y-6 p-6">
                {actionMsg && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {actionMsg}
                  </div>
                )}
                {actionError && (
                  <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {actionError}
                  </div>
                )}

                {/* Original Request Section */}
                <div className="rounded-md border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <h4 className="font-display text-sm font-bold text-[#0F2942]">
                      Original Request
                    </h4>
                    <StatusIndicator status={detailData.request.status} bilingual={bilingual} />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 text-xs sm:grid-cols-3">
                    <div>
                      <span className="text-slate-500">Case Number</span>
                      <p className="mt-0.5 font-mono font-semibold text-slate-900">
                        {detailData.request.case_number}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Location</span>
                      <p className="mt-0.5 font-semibold text-slate-900">
                        {detailData.request.village_name}, {detailData.request.tehsil_name},{' '}
                        {detailData.request.district_name}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Request Date</span>
                      <p className="mt-0.5 font-mono text-slate-900">
                        {formatTimestamp(detailData.request.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 text-xs">
                    <span className="text-slate-500">Case Details</span>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                      {detailData.request.case_details}
                    </p>
                  </div>

                  {detailData.request.additional_instructions && (
                    <div className="mt-3 text-xs">
                      <span className="text-slate-500">Additional Instructions</span>
                      <p className="mt-1 whitespace-pre-wrap text-slate-700">
                        {detailData.request.additional_instructions}
                      </p>
                    </div>
                  )}
                </div>

                {/* Patwari Response Section (Read-only to Court) */}
                <div className="rounded-md border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <h4 className="font-display text-sm font-bold text-[#0F2942]">
                      Patwari Response (Official Submission — Read Only)
                    </h4>
                    {detailData.reports.length > 1 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">Version:</span>
                        {detailData.reports.map((rep, idx) => (
                          <button
                            key={rep.id}
                            type="button"
                            onClick={() => setSelectedVersionIdx(idx)}
                            className={`rounded px-2 py-1 font-mono text-xs cursor-pointer ${
                              selectedVersionIdx === idx
                                ? 'bg-[#0F2942] text-white'
                                : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            v{rep.version}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {!activeReport ? (
                    <div className="py-8 text-center text-sm text-slate-500">
                      Patwari has not submitted a report for this request yet. Current status:{' '}
                      <strong>{detailData.request.status}</strong>.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-3">
                        <div>
                          <span className="text-slate-500">Patwari Name</span>
                          <p className="mt-0.5 font-semibold text-slate-900">
                            {activeReport.patwari_name || detailData.request.patwari_name}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Report Date</span>
                          <p className="mt-0.5 font-mono font-semibold text-slate-900">
                            {activeReport.report_date}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Submission Date (v{activeReport.version})</span>
                          <p className="mt-0.5 font-mono text-slate-900">
                            {formatTimestamp(activeReport.submitted_at)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded bg-slate-50 p-3.5">
                        <p className="text-xs font-semibold text-slate-600">Current Status / Findings</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{activeReport.findings}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-600">Patwari Report / Remarks</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                          {activeReport.remarks}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                        {activeReport.land_details && (
                          <div className="rounded border border-slate-200 p-3">
                            <span className="font-semibold text-slate-600">Land Details</span>
                            <p className="mt-1 text-slate-800">{activeReport.land_details}</p>
                          </div>
                        )}
                        {activeReport.applicant_details && (
                          <div className="rounded border border-slate-200 p-3">
                            <span className="font-semibold text-slate-600">Applicant Details</span>
                            <p className="mt-1 text-slate-800">{activeReport.applicant_details}</p>
                          </div>
                        )}
                        {activeReport.site_verification_details && (
                          <div className="rounded border border-slate-200 p-3">
                            <span className="font-semibold text-slate-600">Site Verification Details</span>
                            <p className="mt-1 text-slate-800">{activeReport.site_verification_details}</p>
                          </div>
                        )}
                        {activeReport.revenue_record_details && (
                          <div className="rounded border border-slate-200 p-3">
                            <span className="font-semibold text-slate-600">Revenue Record Details</span>
                            <p className="mt-1 text-slate-800">{activeReport.revenue_record_details}</p>
                          </div>
                        )}
                      </div>

                      {activeReport.other_info && (
                        <div className="text-xs">
                          <span className="font-semibold text-slate-600">Other Relevant Information</span>
                          <p className="mt-1 text-slate-800">{activeReport.other_info}</p>
                        </div>
                      )}

                      {parsedAttachments.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-semibold text-slate-600">Uploaded Documents</p>
                          <div className="flex flex-wrap gap-2">
                            {parsedAttachments.map((file) => (
                              <a
                                key={file.filename}
                                href={withAuthToken(`/api/uploads/${encodeURIComponent(file.filename)}`)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-[#0F2942] hover:bg-slate-100"
                              >
                                <Paperclip className="h-3.5 w-3.5" />
                                <span>{file.originalName}</span>
                                <Download className="h-3 w-3 text-slate-400" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeReport.correction_reason && (
                        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                          <strong>Court Correction Remarks (v{activeReport.version}):</strong>{' '}
                          {activeReport.correction_reason}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Court Decision Actions */}
                {['Report Submitted', 'Report Resubmitted'].includes(detailData.request.status) && (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-5">
                    <h4 className="font-display text-sm font-bold text-[#0F2942]">
                      Court Action on Patwari Report
                    </h4>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={handleAcceptReport}
                        className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>ACCEPT REPORT</span>
                      </button>

                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => setShowReturnBox((prev) => !prev)}
                        className="inline-flex items-center gap-2 rounded-md border border-rose-300 bg-white px-5 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>RETURN FOR CORRECTION</span>
                      </button>
                    </div>

                    {showReturnBox && (
                      <form onSubmit={handleReturnForCorrection} className="mt-4 space-y-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                            Reason for Correction *
                          </label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Specify what details, measurements, or revenue records the Patwari must clarify or update..."
                            value={correctionReason}
                            onChange={(e) => setCorrectionReason(e.target.value)}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-rose-600 focus:outline-none"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={actionBusy}
                          className="rounded-md bg-rose-700 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-50 cursor-pointer"
                        >
                          {actionBusy ? 'Returning...' : 'Send Back to Patwari for Correction'}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* Complete Audit History Timeline */}
                <div className="rounded-md border border-slate-200 bg-white p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <History className="h-4 w-4 text-[#0F2942]" />
                    <h4 className="font-display text-sm font-bold text-[#0F2942]">
                      Case Audit Trail &amp; History
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {detailData.history.map((h) => (
                      <div key={h.id} className="flex flex-col justify-between gap-1 border-b border-slate-100 pb-2.5 text-xs last:border-0 sm:flex-row sm:items-start">
                        <div>
                          <p className="font-semibold text-slate-900">{h.action}</p>
                          {h.comments && <p className="mt-0.5 text-slate-600">{h.comments}</p>}
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            By {h.performed_by_name} ({h.performed_by_role} · {h.performed_by_user_id})
                          </p>
                        </div>
                        <span className="font-mono text-[11px] text-slate-400 shrink-0">
                          {formatTimestamp(h.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
