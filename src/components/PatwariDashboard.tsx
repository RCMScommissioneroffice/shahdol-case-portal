import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  FilePenLine,
  History,
  LayoutDashboard,
  Paperclip,
  ShieldAlert,
  Upload,
  UserCircle2,
  X
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest, withAuthToken } from '../api';
import type {
  AttachmentMeta,
  AuthUser,
  CaseRequestItem,
  NotificationItem,
  PatwariReportItem,
  ReportHistoryItem
} from '../types';
import { DashboardShell, type NavItem } from './DashboardShell';
import { StatusIndicator, formatDateTime, formatTimestamp } from './StatusBadge';

interface PatwariDashboardProps {
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

export function PatwariDashboard({
  user,
  bilingual,
  onToggleBilingual,
  onLogout,
  notifications,
  unreadCount,
  onMarkNotificationRead,
  onMarkAllRead,
  onRefreshNotifications
}: PatwariDashboardProps) {
  const patwari = user.patwariProfile!;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [requests, setRequests] = useState<CaseRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tableSearch, setTableSearch] = useState('');

  // Active case preparation state
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<{
    request: CaseRequestItem;
    reports: PatwariReportItem[];
    history: ReportHistoryItem[];
  } | null>(null);

  // Report Form state
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [findings, setFindings] = useState('');
  const [remarks, setRemarks] = useState('');
  const [landDetails, setLandDetails] = useState('');
  const [applicantDetails, setApplicantDetails] = useState('');
  const [siteVerificationDetails, setSiteVerificationDetails] = useState('');
  const [revenueRecordDetails, setRevenueRecordDetails] = useState('');
  const [otherInfo, setOtherInfo] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ requests: CaseRequestItem[] }>('/api/patwari/requests');
      setRequests(res.requests);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to load requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests().catch(() => {});
  }, [loadRequests]);

  async function openPrepareReport(requestId: string) {
    setSelectedRequestId(requestId);
    setDetailLoading(true);
    setFormError('');
    setFormSuccess('');
    setFiles(null);
    try {
      const res = await apiRequest<{
        request: CaseRequestItem;
        reports: PatwariReportItem[];
        history: ReportHistoryItem[];
      }>(`/api/patwari/requests/${encodeURIComponent(requestId)}`);
      setDetailData(res);

      // Pre-fill from latest report if returned for correction
      if (res.reports.length > 0 && res.request.status === 'Returned for Correction') {
        const latest = res.reports[0];
        setReportDate(new Date().toISOString().slice(0, 10));
        setFindings(latest.findings || '');
        setRemarks(latest.remarks || '');
        setLandDetails(latest.land_details || '');
        setApplicantDetails(latest.applicant_details || '');
        setSiteVerificationDetails(latest.site_verification_details || '');
        setRevenueRecordDetails(latest.revenue_record_details || '');
        setOtherInfo(latest.other_info || '');
      } else {
        setReportDate(new Date().toISOString().slice(0, 10));
        setFindings('');
        setRemarks('');
        setLandDetails('');
        setApplicantDetails('');
        setSiteVerificationDetails('');
        setRevenueRecordDetails('');
        setOtherInfo('');
      }

      await loadRequests();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to open case request.');
    } finally {
      setDetailLoading(false);
    }
  }

  async function markInProgress() {
    if (!detailData) return;
    setFormError('');
    try {
      await apiRequest(`/api/patwari/requests/${encodeURIComponent(detailData.request.request_id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Report in Progress' })
      });
      await openPrepareReport(detailData.request.request_id);
      await loadRequests();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not update status.');
    }
  }

  async function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!detailData) return;
    setFormError('');
    setFormSuccess('');
    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('reportDate', reportDate);
      fd.append('findings', findings);
      fd.append('remarks', remarks);
      fd.append('landDetails', landDetails);
      fd.append('applicantDetails', applicantDetails);
      fd.append('siteVerificationDetails', siteVerificationDetails);
      fd.append('revenueRecordDetails', revenueRecordDetails);
      fd.append('otherInfo', otherInfo);
      if (files) {
        for (let i = 0; i < files.length; i++) {
          fd.append('attachments', files[i]);
        }
      }

      const res = await apiRequest<{ message: string }>(
        `/api/patwari/requests/${encodeURIComponent(detailData.request.request_id)}/report`,
        {
          method: 'POST',
          body: fd
        }
      );

      setFormSuccess(res.message);
      await openPrepareReport(detailData.request.request_id);
      await loadRequests();
      onRefreshNotifications();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  }

  const correctionCount = requests.filter((r) => r.status === 'Returned for Correction').length;
  const pendingCount = requests.filter((r) =>
    ['Pending', 'Viewed by Patwari', 'Report in Progress'].includes(r.status)
  ).length;
  const submittedCount = requests.filter((r) =>
    ['Report Submitted', 'Report Resubmitted'].includes(r.status)
  ).length;
  const closedCount = requests.filter((r) => r.status === 'Closed').length;

  const visibleRequests = requests.filter((r) => {
    if (activeTab === 'corrections' && r.status !== 'Returned for Correction') return false;
    if (activeTab === 'submitted' && !['Report Submitted', 'Report Resubmitted', 'Closed'].includes(r.status)) {
      return false;
    }
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      return (
        r.request_id.toLowerCase().includes(q) ||
        r.case_number.toLowerCase().includes(q) ||
        (r.court_name || '').toLowerCase().includes(q) ||
        r.case_details.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', labelHi: 'डैशबोर्ड', icon: LayoutDashboard },
    { id: 'my-requests', label: 'My Report Requests', labelHi: 'प्राप्त अनुरोध', icon: ClipboardList, badge: pendingCount },
    {
      id: 'corrections',
      label: 'Correction Required',
      labelHi: 'सुधार आवश्यक',
      icon: AlertTriangle,
      badge: correctionCount
    },
    { id: 'submitted', label: 'Submitted Reports', labelHi: 'प्रस्तुत प्रतिवेदन', icon: FilePenLine },
    { id: 'profile', label: 'Profile', labelHi: 'प्रोफ़ाइल', icon: UserCircle2 }
  ];

  const canPrepareOrEdit =
    detailData &&
    ['Pending', 'Viewed by Patwari', 'Report in Progress', 'Returned for Correction'].includes(
      detailData.request.status
    );

  return (
    <DashboardShell
      user={user}
      title={bilingual ? 'Shahdol Division – Patwari Dashboard · पटवारी डैशबोर्ड' : 'Shahdol Division – Patwari Dashboard'}
      subtitle={`${patwari.patwari_name} · Village ${patwari.village_name}, ${patwari.tehsil_name}, ${patwari.district_name}`}
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={onLogout}
      bilingual={bilingual}
      onToggleBilingual={onToggleBilingual}
      onOpenRequest={openPrepareReport}
      unreadCount={unreadCount}
      notifications={notifications}
      onMarkNotificationRead={onMarkNotificationRead}
      onMarkAllRead={onMarkAllRead}
    >
      {/* Patwari Jurisdiction Header Card */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-5">
          <div>
            <p className="text-slate-500">Patwari Name</p>
            <p className="mt-0.5 font-semibold text-slate-900">{patwari.patwari_name}</p>
          </div>
          <div>
            <p className="text-slate-500">District · जिला</p>
            <p className="mt-0.5 font-semibold text-slate-900">{patwari.district_name}</p>
          </div>
          <div>
            <p className="text-slate-500">Tehsil · तहसील</p>
            <p className="mt-0.5 font-semibold text-slate-900">{patwari.tehsil_name}</p>
          </div>
          <div>
            <p className="text-slate-500">Assigned Village · ग्राम</p>
            <p className="mt-0.5 font-semibold text-emerald-800">{patwari.village_name}</p>
          </div>
          <div>
            <p className="text-slate-500">Phone Number</p>
            <p className="mt-0.5 font-mono font-semibold text-slate-900">{patwari.patwari_phone}</p>
          </div>
        </div>
      </div>

      {correctionCount > 0 && activeTab !== 'profile' && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-5 py-3.5 text-sm text-rose-900">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-700" />
            <span>
              <strong>Correction Required:</strong> {correctionCount} report(s) returned by Court for clarification or revision.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('corrections')}
            className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800 cursor-pointer"
          >
            Review Correction Requests
          </button>
        </div>
      )}

      {activeTab === 'profile' ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="font-display text-lg font-bold text-[#0F2942]">Patwari Profile</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-md border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Patwari User ID</p>
              <p className="mt-1 font-mono font-semibold text-emerald-900">{user.userId}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Patwari Name</p>
              <p className="mt-1 font-semibold text-slate-900">{patwari.patwari_name}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Phone Number</p>
              <p className="mt-1 font-mono font-semibold text-slate-900">{patwari.patwari_phone}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Mapped Jurisdiction</p>
              <p className="mt-1 font-semibold text-slate-900">
                Village {patwari.village_name}, {patwari.tehsil_name}, {patwari.district_name}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">Pending / In Progress</p>
                <p className="mt-2 font-mono text-2xl font-bold text-amber-700 tabular-nums">{pendingCount}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">Correction Required</p>
                <p className="mt-2 font-mono text-2xl font-bold text-rose-700 tabular-nums">{correctionCount}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">Submitted to Court</p>
                <p className="mt-2 font-mono text-2xl font-bold text-emerald-700 tabular-nums">{submittedCount}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">Closed Cases</p>
                <p className="mt-2 font-mono text-2xl font-bold text-slate-700 tabular-nums">{closedCount}</p>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-display text-base font-bold text-[#0F2942]">
                  My Report Requests {bilingual ? '· ग्राम के प्राप्त प्रतिवेदन अनुरोध' : ''}
                </h2>
                <p className="text-xs text-slate-500">
                  Showing only requests mapped to Village <strong>{patwari.village_name}</strong> ({patwari.tehsil_name}, {patwari.district_name}).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  placeholder="Search Request ID, Case No..."
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
                  <option value="Returned for Correction">Correction Required</option>
                  <option value="Report Submitted">Report Submitted</option>
                  <option value="Report Resubmitted">Report Resubmitted</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading assigned requests...</div>
            ) : visibleRequests.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                No report requests match this filter for Village {patwari.village_name}.
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <th className="px-4 py-3 font-semibold">Request ID</th>
                        <th className="px-4 py-3 font-semibold">Case No.</th>
                        <th className="px-4 py-3 font-semibold">Court Name</th>
                        <th className="px-4 py-3 font-semibold">Case Details</th>
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleRequests.map((reqItem) => (
                        <tr key={reqItem.request_id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 font-mono font-semibold text-[#0F2942] whitespace-nowrap">
                            {reqItem.request_id}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-800 whitespace-nowrap">
                            {reqItem.case_number}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">{reqItem.court_name}</td>
                          <td className="max-w-xs truncate px-4 py-3 text-slate-600" title={reqItem.case_details}>
                            {reqItem.case_details}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                            {formatDateTime(reqItem.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusIndicator status={reqItem.status} bilingual={bilingual} patwariLabel />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openPrepareReport(reqItem.request_id)}
                              className="rounded bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-900 whitespace-nowrap cursor-pointer"
                            >
                              VIEW / PREPARE REPORT
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="divide-y divide-slate-200 md:hidden">
                  {visibleRequests.map((reqItem) => (
                    <div key={reqItem.request_id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-xs font-bold text-[#0F2942]">{reqItem.request_id}</p>
                          <p className="font-mono text-xs text-slate-600">Case: {reqItem.case_number}</p>
                        </div>
                        <StatusIndicator status={reqItem.status} patwariLabel />
                      </div>
                      <p className="text-xs font-medium text-slate-800">{reqItem.court_name}</p>
                      <p className="line-clamp-2 text-xs text-slate-600">{reqItem.case_details}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-mono text-[11px] text-slate-500">
                          {formatDateTime(reqItem.created_at)}
                        </span>
                        <button
                          type="button"
                          onClick={() => openPrepareReport(reqItem.request_id)}
                          className="rounded bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                        >
                          VIEW / PREPARE REPORT
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Patwari View / Prepare Report Modal */}
      {selectedRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-6">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <p className="font-mono text-xs text-slate-500">PATWARI FIELD REPORT PORTAL</p>
                <h3 className="font-display text-lg font-bold text-[#0F2942]">{selectedRequestId}</h3>
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
              <div className="p-10 text-center text-sm text-slate-500">Loading Court request details...</div>
            ) : (
              <div className="space-y-6 p-6">
                {/* Read-Only Court Request */}
                <div className="rounded-md border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <h4 className="font-display text-sm font-bold text-[#0F2942]">
                      Court Request (Read-Only · न्यायालय का मूल अनुरोध)
                    </h4>
                    <StatusIndicator status={detailData.request.status} bilingual={bilingual} patwariLabel />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
                    <div>
                      <span className="text-slate-500">Request ID</span>
                      <p className="mt-0.5 font-mono font-semibold text-slate-900">{detailData.request.request_id}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Case Number</span>
                      <p className="mt-0.5 font-mono font-semibold text-slate-900">{detailData.request.case_number}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Court Name</span>
                      <p className="mt-0.5 font-semibold text-slate-900">{detailData.request.court_name}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">District</span>
                      <p className="mt-0.5 font-semibold text-slate-900">{detailData.request.district_name}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Tehsil</span>
                      <p className="mt-0.5 font-semibold text-slate-900">{detailData.request.tehsil_name}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Village</span>
                      <p className="mt-0.5 font-semibold text-slate-900">{detailData.request.village_name}</p>
                    </div>
                  </div>

                  <div className="mt-4 text-xs">
                    <span className="text-slate-500">Case Details</span>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-900">
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

                  {['Viewed by Patwari', 'Pending'].includes(detailData.request.status) && (
                    <div className="mt-4 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={markInProgress}
                        className="rounded-md border border-indigo-300 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 cursor-pointer"
                      >
                        Mark Status: Report in Progress
                      </button>
                    </div>
                  )}
                </div>

                {/* Correction Remarks Banner if Returned */}
                {detailData.request.status === 'Returned for Correction' && detailData.reports.length > 0 && (
                  <div className="rounded-md border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
                    <p className="font-bold">Correction Required — Court Remarks:</p>
                    <p className="mt-1">{detailData.reports[0].correction_reason}</p>
                  </div>
                )}

                {formSuccess && (
                  <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{formSuccess}</span>
                  </div>
                )}
                {formError && (
                  <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Patwari Report Form */}
                {canPrepareOrEdit ? (
                  <form onSubmit={handleSubmitReport} className="rounded-md border border-slate-200 bg-white p-5 space-y-4">
                    <h4 className="font-display text-base font-bold text-[#0F2942] border-b border-slate-200 pb-3">
                      PATWARI REPORT {detailData.request.status === 'Returned for Correction' ? '(Resubmission)' : ''}
                    </h4>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                          Report Date (प्रतिवेदन दिनांक) *
                        </label>
                        <input
                          type="date"
                          required
                          value={reportDate}
                          onChange={(e) => setReportDate(e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                          Current Status / Findings (वर्तमान स्थिति / निष्कर्ष) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., Spot verification completed, boundary verified"
                          value={findings}
                          onChange={(e) => setFindings(e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Patwari Report / Remarks (पटवारी का विस्तृत प्रतिवेदन) *
                      </label>
                      <textarea
                        required
                        rows={5}
                        placeholder="Enter complete field report, Khasra details, possession verification, and official remarks..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                          Land Details (भूमि विवरण - Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Khasra No., Area, Halka No."
                          value={landDetails}
                          onChange={(e) => setLandDetails(e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#0F2942] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                          Applicant Details (आवेदक विवरण - Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Applicant name & residence"
                          value={applicantDetails}
                          onChange={(e) => setApplicantDetails(e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#0F2942] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                          Site Verification Details (स्थल सत्यापन - Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Inspection date, panchnama witnesses"
                          value={siteVerificationDetails}
                          onChange={(e) => setSiteVerificationDetails(e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#0F2942] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                          Revenue Record Details (राजस्व अभिलेख - Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="B-1 Khatauni / Khasra / Naksha details"
                          value={revenueRecordDetails}
                          onChange={(e) => setRevenueRecordDetails(e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#0F2942] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Other Relevant Information (अन्य प्रासंगिक जानकारी - Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Any additional notes"
                        value={otherInfo}
                        onChange={(e) => setOtherInfo(e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#0F2942] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Upload Documents / Site Photos (PDF, JPG, PNG — Optional, max 5 files)
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-700 hover:bg-slate-100">
                        <Upload className="h-4 w-4 text-slate-500" />
                        <span>
                          {files && files.length > 0
                            ? `${files.length} file(s) selected`
                            : 'Choose Panchnama, Khasra copy, or site photos...'}
                        </span>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
                          onChange={(e) => setFiles(e.target.files)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-md bg-emerald-800 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60 cursor-pointer"
                      >
                        {submitting
                          ? 'Submitting Report...'
                          : detailData.request.status === 'Returned for Correction'
                          ? 'RESUBMIT REPORT TO COURT'
                          : 'SUBMIT REPORT TO COURT'}
                      </button>
                    </div>
                  </form>
                ) : null}

                {/* Previous Report Versions */}
                {detailData.reports.length > 0 && (
                  <div className="rounded-md border border-slate-200 bg-white p-5 space-y-4">
                    <h4 className="font-display text-sm font-bold text-[#0F2942]">
                      Submitted Report Versions ({detailData.reports.length})
                    </h4>
                    {detailData.reports.map((rep) => {
                      let atts: AttachmentMeta[] = [];
                      try {
                        atts = JSON.parse(rep.attachments_json || '[]');
                      } catch {
                        atts = [];
                      }
                      return (
                        <div key={rep.id} className="rounded-md border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono font-bold text-[#0F2942]">
                              Version {rep.version} · {rep.status}
                            </span>
                            <span className="font-mono text-slate-500">{formatTimestamp(rep.submitted_at)}</span>
                          </div>
                          <p>
                            <strong>Findings:</strong> {rep.findings}
                          </p>
                          <p className="whitespace-pre-wrap">
                            <strong>Remarks:</strong> {rep.remarks}
                          </p>
                          {rep.correction_reason && (
                            <p className="text-rose-700">
                              <strong>Returned Reason:</strong> {rep.correction_reason}
                            </p>
                          )}
                          {atts.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {atts.map((a) => (
                                <a
                                  key={a.filename}
                                  href={withAuthToken(`/api/uploads/${encodeURIComponent(a.filename)}`)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-[#0F2942]"
                                >
                                  <Paperclip className="h-3 w-3" />
                                  <span>{a.originalName}</span>
                                  <Download className="h-3 w-3" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* History Timeline */}
                <div className="rounded-md border border-slate-200 bg-white p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <History className="h-4 w-4 text-[#0F2942]" />
                    <h4 className="font-display text-sm font-bold text-[#0F2942]">Case History</h4>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    {detailData.history.map((h) => (
                      <div key={h.id} className="flex flex-col justify-between gap-1 border-b border-slate-100 pb-2 last:border-0 sm:flex-row">
                        <div>
                          <p className="font-semibold text-slate-900">{h.action}</p>
                          {h.comments && <p className="text-slate-600">{h.comments}</p>}
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
