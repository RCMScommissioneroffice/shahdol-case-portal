import {
  BarChart3,
  ClipboardList,
  Database,
  Download,
  History,
  LayoutDashboard,
  MapPin,
  ShieldCheck,
  Users,
  X
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest, getAuthToken } from '../api';
import type {
  AdminOverviewData,
  AuthUser,
  CaseRequestItem,
  DistrictItem,
  NotificationItem,
  PatwariReportItem,
  ReportHistoryItem,
  TehsilItem,
  VillageItem
} from '../types';
import { CaseTrendChart, DivisionBarChart, StatusPieChart } from './AdminCharts';
import { DashboardShell, type NavItem } from './DashboardShell';
import { StatusIndicator, formatDateTime, formatTimestamp } from './StatusBadge';

interface AdminDashboardProps {
  user: AuthUser;
  bilingual: boolean;
  onToggleBilingual: () => void;
  onLogout: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkNotificationRead: (id: number) => void;
  onMarkAllRead: () => void;
}

interface AdminUserRow {
  id: number;
  user_id: string;
  role: string;
  name: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  court_name?: string;
  court_district?: string;
  court_tehsil?: string;
  patwari_name?: string;
  patwari_district?: string;
  patwari_tehsil?: string;
  patwari_village?: string;
}

export function AdminDashboard({
  user,
  bilingual,
  onToggleBilingual,
  onLogout,
  notifications,
  unreadCount,
  onMarkNotificationRead,
  onMarkAllRead
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [reportScope, setReportScope] = useState<'district' | 'tehsil' | 'village' | 'court' | 'patwari'>('district');
  const [usersList, setUsersList] = useState<AdminUserRow[]>([]);
  const [allRequests, setAllRequests] = useState<CaseRequestItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<Array<Record<string, unknown>>>([]);
  const [masterData, setMasterData] = useState<{
    districts: DistrictItem[];
    tehsils: TehsilItem[];
    villages: Array<VillageItem & { patwari_id?: number; patwari_name?: string; patwari_user_id?: string }>;
    courts: Array<Record<string, unknown>>;
    patwaris: Array<Record<string, unknown>>;
  } | null>(null);

  // Master Data Forms
  const [newDistrictName, setNewDistrictName] = useState('');
  const [newDistrictCode, setNewDistrictCode] = useState('');
  const [newTehsilDistId, setNewTehsilDistId] = useState('');
  const [newTehsilName, setNewTehsilName] = useState('');
  const [newVilDistId, setNewVilDistId] = useState('');
  const [newVilTehsilId, setNewVilTehsilId] = useState('');
  const [newVilName, setNewVilName] = useState('');
  const [mapPatwariId, setMapPatwariId] = useState('');
  const [mapVillageId, setMapVillageId] = useState('');
  const [adminMsg, setAdminMsg] = useState('');
  const [adminErr, setAdminErr] = useState('');
  const [exportingZip, setExportingZip] = useState(false);
  const [resetTargetUserId, setResetTargetUserId] = useState<string | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminResetBusy, setAdminResetBusy] = useState(false);

  // Case inspection modal
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [caseDetail, setCaseDetail] = useState<{
    request: CaseRequestItem;
    reports: PatwariReportItem[];
    history: ReportHistoryItem[];
  } | null>(null);

  const loadAll = useCallback(async () => {
    const [ov, usr, reqs, md, logs] = await Promise.all([
      apiRequest<AdminOverviewData>('/api/admin/overview'),
      apiRequest<{ users: AdminUserRow[] }>('/api/admin/users'),
      apiRequest<{ requests: CaseRequestItem[] }>('/api/admin/requests'),
      apiRequest<{
        districts: DistrictItem[];
        tehsils: TehsilItem[];
        villages: Array<VillageItem & { patwari_id?: number; patwari_name?: string; patwari_user_id?: string }>;
        courts: Array<Record<string, unknown>>;
        patwaris: Array<Record<string, unknown>>;
      }>('/api/admin/master-data'),
      apiRequest<{ logs: Array<Record<string, unknown>> }>('/api/admin/audit-logs')
    ]);
    setOverview(ov);
    setUsersList(usr.users);
    setAllRequests(reqs.requests);
    setMasterData(md);
    setAuditLogs(logs.logs);
  }, []);

  useEffect(() => {
    loadAll().catch(() => {});
  }, [loadAll]);

  async function openCaseModal(requestId: string) {
    setSelectedRequestId(requestId);
    const res = await apiRequest<{
      request: CaseRequestItem;
      reports: PatwariReportItem[];
      history: ReportHistoryItem[];
    }>(`/api/admin/requests/${encodeURIComponent(requestId)}`);
    setCaseDetail(res);
  }

  async function toggleUserStatus(targetUserId: string, current: 'ACTIVE' | 'INACTIVE') {
    setAdminErr('');
    setAdminMsg('');
    const next = current === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await apiRequest<{ message: string }>(
        `/api/admin/users/${encodeURIComponent(targetUserId)}/status`,
        { method: 'PATCH', body: JSON.stringify({ status: next }) }
      );
      setAdminMsg(res.message);
      await loadAll();
    } catch (err) {
      setAdminErr(err instanceof Error ? err.message : 'Status update failed.');
    }
  }

  async function handleAddDistrict(e: React.FormEvent) {
    e.preventDefault();
    setAdminErr('');
    setAdminMsg('');
    try {
      await apiRequest('/api/admin/districts', {
        method: 'POST',
        body: JSON.stringify({ districtName: newDistrictName, code: newDistrictCode })
      });
      setNewDistrictName('');
      setNewDistrictCode('');
      setAdminMsg('District added successfully.');
      await loadAll();
    } catch (err) {
      setAdminErr(err instanceof Error ? err.message : 'Failed to add district.');
    }
  }

  async function handleAddTehsil(e: React.FormEvent) {
    e.preventDefault();
    setAdminErr('');
    setAdminMsg('');
    try {
      await apiRequest('/api/admin/tehsils', {
        method: 'POST',
        body: JSON.stringify({ districtId: Number(newTehsilDistId), tehsilName: newTehsilName })
      });
      setNewTehsilName('');
      setAdminMsg('Tehsil added successfully.');
      await loadAll();
    } catch (err) {
      setAdminErr(err instanceof Error ? err.message : 'Failed to add tehsil.');
    }
  }

  async function handleAddVillage(e: React.FormEvent) {
    e.preventDefault();
    setAdminErr('');
    setAdminMsg('');
    try {
      await apiRequest('/api/admin/villages', {
        method: 'POST',
        body: JSON.stringify({
          districtId: Number(newVilDistId),
          tehsilId: Number(newVilTehsilId),
          villageName: newVilName
        })
      });
      setNewVilName('');
      setAdminMsg('Village added successfully.');
      await loadAll();
    } catch (err) {
      setAdminErr(err instanceof Error ? err.message : 'Failed to add village.');
    }
  }

  async function handleMapPatwari(e: React.FormEvent) {
    e.preventDefault();
    setAdminErr('');
    setAdminMsg('');
    try {
      const res = await apiRequest<{ message: string }>('/api/admin/mappings/patwari-village', {
        method: 'POST',
        body: JSON.stringify({ patwariId: Number(mapPatwariId), villageId: Number(mapVillageId) })
      });
      setAdminMsg(res.message);
      await loadAll();
    } catch (err) {
      setAdminErr(err instanceof Error ? err.message : 'Mapping update failed.');
    }
  }

  async function handleDownloadSourceZip() {
    setAdminErr('');
    setAdminMsg('');
    setExportingZip(true);
    try {
      const token = getAuthToken();
      const response = await fetch('/api/admin/export-source', {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || `Export failed (${response.status})`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'shahdol-division-portal.zip';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setAdminMsg('Project source archive (shahdol-division-portal.zip) downloaded.');
    } catch (err) {
      setAdminErr(err instanceof Error ? err.message : 'Failed to download source archive.');
    } finally {
      setExportingZip(false);
    }
  }

  async function handleAdminResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTargetUserId) return;
    setAdminErr('');
    setAdminMsg('');
    setAdminResetBusy(true);
    try {
      const res = await apiRequest<{ message: string }>(
        `/api/admin/users/${encodeURIComponent(resetTargetUserId)}/reset-password`,
        {
          method: 'POST',
          body: JSON.stringify({ newPassword: adminNewPassword })
        }
      );
      setAdminMsg(res.message);
      setResetTargetUserId(null);
      setAdminNewPassword('');
    } catch (err) {
      setAdminErr(err instanceof Error ? err.message : 'Password reset failed.');
    } finally {
      setAdminResetBusy(false);
    }
  }

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard & KPIs', labelHi: 'मुख्य डैशबोर्ड', icon: LayoutDashboard },
    { id: 'reports', label: 'Division Reports', labelHi: 'विभागीय रिपोर्ट', icon: BarChart3 },
    { id: 'requests', label: 'All Case Requests', labelHi: 'समस्त प्रकरण', icon: ClipboardList },
    { id: 'master-data', label: 'Districts & Mapping', labelHi: 'मैपिंग प्रबंधन', icon: MapPin },
    { id: 'users', label: 'Users & Access', labelHi: 'उपयोगकर्ता', icon: Users },
    { id: 'audit', label: 'Audit Logs', labelHi: 'ऑडिट लॉग', icon: History }
  ];

  const kpis = overview?.kpis;

  return (
    <DashboardShell
      user={user}
      title="Shahdol Division – System Administrator Portal"
      subtitle="Divisional Commissioner Office · Master Data, Court–Patwari Mapping, Analytics & Security"
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={onLogout}
      bilingual={bilingual}
      onToggleBilingual={onToggleBilingual}
      onOpenRequest={openCaseModal}
      unreadCount={unreadCount}
      notifications={notifications}
      onMarkNotificationRead={onMarkNotificationRead}
      onMarkAllRead={onMarkAllRead}
    >
      {adminMsg && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-900">
          {adminMsg}
        </div>
      )}
      {adminErr && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-800">
          {adminErr}
        </div>
      )}

      {activeTab === 'dashboard' && overview && kpis && (
        <div className="space-y-6">
          {/* 7 Required KPI Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {[
              { label: 'Total Courts', val: kpis.totalCourts, tone: 'text-[#0F2942]' },
              { label: 'Total Patwaris', val: kpis.totalPatwaris, tone: 'text-emerald-800' },
              { label: 'Total Requests', val: kpis.totalRequests, tone: 'text-slate-900' },
              { label: 'Pending Requests', val: kpis.pendingRequests, tone: 'text-amber-700' },
              { label: 'Reports Submitted', val: kpis.reportsSubmitted, tone: 'text-emerald-700' },
              { label: 'Awaiting Response', val: kpis.reportsAwaitingResponse, tone: 'text-blue-700' },
              { label: 'Closed Cases', val: kpis.closedCases, tone: 'text-slate-700' }
            ].map((card) => (
              <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-medium text-slate-500">{card.label}</p>
                <p className={`mt-2 font-mono text-2xl font-bold tabular-nums ${card.tone}`}>{card.val}</p>
              </div>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-5">
              <h2 className="font-display text-sm font-bold text-[#0F2942] mb-4">
                Case Status Breakdown (Pie Chart)
              </h2>
              <StatusPieChart data={overview.statusBreakdown} />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-7">
              <h2 className="font-display text-sm font-bold text-[#0F2942] mb-4">
                District-Wise Performance (Bar Chart)
              </h2>
              <DivisionBarChart
                rows={overview.districtWise.map((d) => ({
                  name: String(d.name),
                  totalRequests: Number(d.totalRequests || 0),
                  pending: Number(d.pending || 0) + Number(d.inProgress || 0),
                  submitted: Number(d.submitted || 0),
                  closed: Number(d.closed || 0)
                }))}
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-display text-sm font-bold text-[#0F2942] mb-4">
              Monthly Case &amp; Report Trend Chart
            </h2>
            <CaseTrendChart data={overview.trend} />
          </div>

          <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-sm font-bold text-[#0B1F3A]">
                {bilingual ? 'प्रोजेक्ट सोर्स एवं होस्टिंग एक्सपोर्ट' : 'Project Source & Hosting Export'}
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                {bilingual
                  ? 'GitHub / Render.com पर निःशुल्क पब्लिश करने हेतु क्लीन प्रोजेक्ट सोर्स (.zip) डाउनलोड करें।'
                  : 'Download a clean project source archive (.zip) ready for GitHub upload and Render.com deployment.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadSourceZip}
              disabled={exportingZip}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-[#0B1F3A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#132F54] disabled:opacity-60 cursor-pointer"
            >
              <Download className="h-4 w-4 text-[#F59E0B]" />
              {exportingZip ? 'Preparing ZIP...' : 'Download Project Source (.zip)'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'reports' && overview && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-display text-base font-bold text-[#0F2942]">
              Administrative Reporting Dashboards
            </h2>
            <div className="flex flex-wrap gap-1.5 rounded-md bg-slate-100 p-1">
              {[
                { id: 'district', label: 'District-wise' },
                { id: 'tehsil', label: 'Tehsil-wise' },
                { id: 'village', label: 'Village-wise' },
                { id: 'court', label: 'Court-wise' },
                { id: 'patwari', label: 'Patwari-wise' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setReportScope(t.id as typeof reportScope)}
                  className={`rounded px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                    reportScope === t.id ? 'bg-white text-[#0F2942] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
            {reportScope === 'court' ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-4 py-3 font-semibold">Court Name</th>
                    <th className="px-4 py-3 font-semibold">District / Tehsil</th>
                    <th className="px-4 py-3 text-right font-semibold">Requests Sent</th>
                    <th className="px-4 py-3 text-right font-semibold">Reports Received</th>
                    <th className="px-4 py-3 text-right font-semibold">Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overview.courtWise.map((row) => (
                    <tr key={String(row.user_id)}>
                      <td className="px-4 py-3 font-medium text-slate-900">{String(row.name)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {String(row.tehsil)}, {String(row.district)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{Number(row.requestsSent)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-700">
                        {Number(row.reportsReceived)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-amber-700">
                        {Number(row.pending)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : reportScope === 'patwari' ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-4 py-3 font-semibold">Patwari Name</th>
                    <th className="px-4 py-3 font-semibold">Village / Tehsil</th>
                    <th className="px-4 py-3 text-right font-semibold">Requests Received</th>
                    <th className="px-4 py-3 text-right font-semibold">Reports Submitted</th>
                    <th className="px-4 py-3 text-right font-semibold">Pending</th>
                    <th className="px-4 py-3 text-right font-semibold">Correction Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overview.patwariWise.map((row) => (
                    <tr key={String(row.user_id)}>
                      <td className="px-4 py-3 font-medium text-slate-900">{String(row.name)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {String(row.village)}, {String(row.tehsil)} ({String(row.district)})
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{Number(row.requestsReceived)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-700">
                        {Number(row.reportsSubmitted)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-amber-700">
                        {Number(row.pending)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-rose-700">
                        {Number(row.correctionRequired)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-4 py-3 font-semibold">
                      {reportScope === 'district' ? 'District' : reportScope === 'tehsil' ? 'Tehsil' : 'Village'}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">Total Requests</th>
                    <th className="px-4 py-3 text-right font-semibold">Pending</th>
                    <th className="px-4 py-3 text-right font-semibold">In Progress</th>
                    <th className="px-4 py-3 text-right font-semibold">Reports Submitted</th>
                    <th className="px-4 py-3 text-right font-semibold">Closed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportScope === 'district'
                    ? overview.districtWise
                    : reportScope === 'tehsil'
                    ? overview.tehsilWise
                    : overview.villageWise
                  ).map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {String(row.name)}
                        {row.district ? ` (${String(row.district)})` : ''}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{Number(row.totalRequests)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-amber-700">{Number(row.pending)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-indigo-700">
                        {Number(row.inProgress)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-700">
                        {Number(row.submitted)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">{Number(row.closed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-display text-base font-bold text-[#0F2942]">
              All Case Requests Across Division ({allRequests.length})
            </h2>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-4 py-3 font-semibold">Request ID</th>
                <th className="px-4 py-3 font-semibold">Case No.</th>
                <th className="px-4 py-3 font-semibold">Court</th>
                <th className="px-4 py-3 font-semibold">Village / Tehsil</th>
                <th className="px-4 py-3 font-semibold">Patwari</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allRequests.map((r) => (
                <tr key={r.request_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-semibold text-[#0F2942]">{r.request_id}</td>
                  <td className="px-4 py-3 font-mono">{r.case_number}</td>
                  <td className="px-4 py-3">{r.court_name}</td>
                  <td className="px-4 py-3">
                    {r.village_name}, {r.tehsil_name} ({r.district_name})
                  </td>
                  <td className="px-4 py-3">{r.patwari_name}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{formatDateTime(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <StatusIndicator status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openCaseModal(r.request_id)}
                      className="rounded bg-[#0F2942] px-3 py-1 text-xs font-semibold text-white cursor-pointer"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'master-data' && masterData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Add District / Tehsil / Village */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <Database className="h-4 w-4 text-[#0F2942]" />
                <h2 className="font-display text-sm font-bold text-[#0F2942]">
                  Manage Districts, Tehsils &amp; Villages
                </h2>
              </div>

              <form onSubmit={handleAddDistrict} className="flex flex-wrap gap-2">
                <input
                  type="text"
                  required
                  placeholder="New District Name"
                  value={newDistrictName}
                  onChange={(e) => setNewDistrictName(e.target.value)}
                  className="flex-1 rounded border border-slate-300 px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  required
                  maxLength={4}
                  placeholder="Code (e.g. SDL)"
                  value={newDistrictCode}
                  onChange={(e) => setNewDistrictCode(e.target.value)}
                  className="w-28 rounded border border-slate-300 px-3 py-2 font-mono text-xs uppercase"
                />
                <button
                  type="submit"
                  className="rounded bg-[#0F2942] px-3 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Add District
                </button>
              </form>

              <form onSubmit={handleAddTehsil} className="flex flex-wrap gap-2">
                <select
                  required
                  value={newTehsilDistId}
                  onChange={(e) => setNewTehsilDistId(e.target.value)}
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-xs"
                >
                  <option value="">District</option>
                  {masterData.districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.district_name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  placeholder="New Tehsil Name"
                  value={newTehsilName}
                  onChange={(e) => setNewTehsilName(e.target.value)}
                  className="flex-1 rounded border border-slate-300 px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  className="rounded bg-[#0F2942] px-3 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Add Tehsil
                </button>
              </form>

              <form onSubmit={handleAddVillage} className="flex flex-wrap gap-2">
                <select
                  required
                  value={newVilDistId}
                  onChange={(e) => {
                    setNewVilDistId(e.target.value);
                    setNewVilTehsilId('');
                  }}
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-xs"
                >
                  <option value="">District</option>
                  {masterData.districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.district_name}
                    </option>
                  ))}
                </select>
                <select
                  required
                  value={newVilTehsilId}
                  onChange={(e) => setNewVilTehsilId(e.target.value)}
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-xs"
                >
                  <option value="">Tehsil</option>
                  {masterData.tehsils
                    .filter((t) => String(t.district_id) === newVilDistId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tehsil_name}
                      </option>
                    ))}
                </select>
                <input
                  type="text"
                  required
                  placeholder="New Village Name"
                  value={newVilName}
                  onChange={(e) => setNewVilName(e.target.value)}
                  className="flex-1 rounded border border-slate-300 px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  className="rounded bg-[#0F2942] px-3 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Add Village
                </button>
              </form>
            </div>

            {/* Village -> Patwari Mapping Control */}
            <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <MapPin className="h-4 w-4 text-emerald-800" />
                <h2 className="font-display text-sm font-bold text-[#0F2942]">
                  Manage Village ↔ Patwari Routing Mapping
                </h2>
              </div>
              <p className="text-xs text-slate-600">
                Reassign an active Patwari to a different vacant village to update automatic Court → Village → Patwari routing.
              </p>

              <form onSubmit={handleMapPatwari} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Select Patwari</label>
                  <select
                    required
                    value={mapPatwariId}
                    onChange={(e) => setMapPatwariId(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value="">-- Choose Patwari --</option>
                    {masterData.patwaris.map((p) => (
                      <option key={Number(p.id)} value={Number(p.id)}>
                        {String(p.patwari_name)} ({String(p.user_id)}) — currently {String(p.village_name)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Target Village</label>
                  <select
                    required
                    value={mapVillageId}
                    onChange={(e) => setMapVillageId(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value="">-- Choose Target Village --</option>
                    {masterData.villages.map((v) => (
                      <option key={v.id} value={v.id} disabled={Boolean(v.patwari_id)}>
                        {v.district_name} / {v.tehsil_name} / {v.village_name}{' '}
                        {v.patwari_name ? `(Assigned: ${v.patwari_name})` : '(Available)'}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="rounded bg-emerald-800 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900 cursor-pointer"
                >
                  Update Patwari Mapping
                </button>
              </form>
            </div>
          </div>

          {/* Village Directory Table */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
            <div className="border-b border-slate-200 p-4">
              <h3 className="font-display text-sm font-bold text-[#0F2942]">
                Village &amp; Patwari Directory ({masterData.villages.length} Villages)
              </h3>
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-4 py-2.5 font-semibold">District</th>
                  <th className="px-4 py-2.5 font-semibold">Tehsil</th>
                  <th className="px-4 py-2.5 font-semibold">Village</th>
                  <th className="px-4 py-2.5 font-semibold">Mapped Patwari</th>
                  <th className="px-4 py-2.5 font-semibold">User ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {masterData.villages.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-2">{v.district_name}</td>
                    <td className="px-4 py-2">{v.tehsil_name}</td>
                    <td className="px-4 py-2 font-medium text-slate-900">{v.village_name}</td>
                    <td className="px-4 py-2">
                      {v.patwari_name ? (
                        <span className="font-medium text-emerald-800">{v.patwari_name}</span>
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono text-slate-500">{v.patwari_user_id || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-display text-base font-bold text-[#0F2942]">
              User Accounts &amp; Activation Control ({usersList.length})
            </h2>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-4 py-3 font-semibold">User ID</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Name / Office</th>
                <th className="px-4 py-3 font-semibold">Jurisdiction</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usersList.map((u) => (
                <tr key={u.user_id}>
                  <td className="px-4 py-3 font-mono font-semibold text-[#0F2942]">{u.user_id}</td>
                  <td className="px-4 py-3 font-medium">{u.role}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{u.name}</p>
                    {u.court_name && <p className="text-[11px] text-slate-500">{u.court_name}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {u.court_district
                      ? `${u.court_tehsil}, ${u.court_district}`
                      : u.patwari_district
                      ? `${u.patwari_village}, ${u.patwari_tehsil}, ${u.patwari_district}`
                      : 'Shahdol Division'}
                  </td>
                  <td className="px-4 py-3 font-mono">{u.phone}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold ${
                        u.status === 'ACTIVE'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-rose-200 bg-rose-50 text-rose-800'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.user_id !== user.userId && (
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setResetTargetUserId(u.user_id);
                            setAdminNewPassword('');
                            setAdminErr('');
                          }}
                          className="rounded border border-slate-300 px-2.5 py-1 text-xs font-semibold text-[#0F2942] hover:bg-slate-50 cursor-pointer"
                        >
                          Reset Password
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleUserStatus(u.user_id, u.status)}
                          className={`rounded px-3 py-1 text-xs font-semibold cursor-pointer ${
                            u.status === 'ACTIVE'
                              ? 'border border-rose-300 text-rose-700 hover:bg-rose-50'
                              : 'bg-emerald-700 text-white hover:bg-emerald-800'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
          <div className="flex items-center gap-2 border-b border-slate-200 p-4">
            <ShieldCheck className="h-4 w-4 text-[#0F2942]" />
            <h2 className="font-display text-base font-bold text-[#0F2942]">
              Security &amp; Action Audit Logs
            </h2>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-4 py-3 font-semibold">Timestamp</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Entity</th>
                <th className="px-4 py-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <tr key={Number(log.id)}>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {formatTimestamp(String(log.created_at))}
                  </td>
                  <td className="px-4 py-2.5 font-mono font-medium text-slate-800">
                    {String(log.actor_user_id)} ({String(log.actor_role)})
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-[#0F2942]">{String(log.action)}</td>
                  <td className="px-4 py-2.5 font-mono">
                    {String(log.entity_type)} · {String(log.entity_id)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{String(log.details || '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin Reset User Password Modal */}
      {resetTargetUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="font-mono text-xs text-slate-500">ADMIN PASSWORD RESET</p>
                <h3 className="font-display text-base font-bold text-[#0F2942]">{resetTargetUserId}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResetTargetUserId(null);
                  setAdminNewPassword('');
                }}
                className="rounded border border-slate-200 p-1.5 text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAdminResetPassword} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Set New Password (नया पासवर्ड) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetTargetUserId(null);
                    setAdminNewPassword('');
                  }}
                  className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminResetBusy}
                  className="rounded-md bg-[#0F2942] px-4 py-2 text-xs font-semibold text-white hover:bg-[#163859] disabled:opacity-60 cursor-pointer"
                >
                  {adminResetBusy ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Case Detail Inspection Modal */}
      {selectedRequestId && caseDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="font-mono text-xs text-slate-500">ADMIN AUDIT INSPECTION</p>
                <h3 className="font-display text-lg font-bold text-[#0F2942]">{caseDetail.request.request_id}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedRequestId(null);
                  setCaseDetail(null);
                }}
                className="rounded border border-slate-200 p-2 text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-md bg-slate-50 p-4 text-xs sm:grid-cols-3">
              <div>
                <span className="text-slate-500">Case No.</span>
                <p className="font-mono font-semibold">{caseDetail.request.case_number}</p>
              </div>
              <div>
                <span className="text-slate-500">Court</span>
                <p className="font-semibold">{caseDetail.request.court_name}</p>
              </div>
              <div>
                <span className="text-slate-500">Patwari</span>
                <p className="font-semibold">{caseDetail.request.patwari_name}</p>
              </div>
              <div>
                <span className="text-slate-500">Location</span>
                <p>
                  {caseDetail.request.village_name}, {caseDetail.request.tehsil_name},{' '}
                  {caseDetail.request.district_name}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Status</span>
                <div className="mt-0.5">
                  <StatusIndicator status={caseDetail.request.status} />
                </div>
              </div>
            </div>

            <div className="text-xs">
              <p className="font-semibold text-slate-600">Case Details</p>
              <p className="mt-1 text-sm text-slate-900">{caseDetail.request.case_details}</p>
            </div>

            <div className="space-y-3">
              <p className="font-display text-sm font-bold text-[#0F2942]">
                Submitted Patwari Reports ({caseDetail.reports.length})
              </p>
              {caseDetail.reports.map((rep) => (
                <div key={rep.id} className="rounded border border-slate-200 p-3 text-xs space-y-1">
                  <div className="flex justify-between font-mono font-semibold">
                    <span>
                      Version {rep.version} ({rep.status})
                    </span>
                    <span>{formatTimestamp(rep.submitted_at)}</span>
                  </div>
                  <p>
                    <strong>Findings:</strong> {rep.findings}
                  </p>
                  <p>
                    <strong>Remarks:</strong> {rep.remarks}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-slate-200 pt-4 text-xs">
              <p className="font-display text-sm font-bold text-[#0F2942]">Complete History</p>
              {caseDetail.history.map((h) => (
                <div key={h.id} className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span>
                    <strong>{h.action}</strong> — {h.comments} ({h.performed_by_name})
                  </span>
                  <span className="font-mono text-slate-400">{formatTimestamp(h.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
