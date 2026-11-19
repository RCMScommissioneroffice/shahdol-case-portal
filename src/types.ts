export type UserRole = 'COURT' | 'PATWARI' | 'ADMIN';

export type CaseStatus =
  | 'Pending'
  | 'Viewed by Patwari'
  | 'Report in Progress'
  | 'Report Submitted'
  | 'Returned for Correction'
  | 'Report Resubmitted'
  | 'Closed';

export interface CourtProfile {
  id: number;
  district_id: number;
  district_name: string;
  district_code: string;
  tehsil_id: number;
  tehsil_name: string;
  court_name: string;
  po_name: string;
  po_phone: string;
}

export interface PatwariProfile {
  id: number;
  district_id: number;
  district_name: string;
  district_code: string;
  tehsil_id: number;
  tehsil_name: string;
  village_id: number;
  village_name: string;
  patwari_name: string;
  patwari_phone: string;
}

export interface AuthUser {
  id: number;
  userId: string;
  role: UserRole;
  name: string;
  phone: string;
  status: string;
  courtProfile?: CourtProfile;
  patwariProfile?: PatwariProfile;
}

export interface DistrictItem {
  id: number;
  district_name: string;
  code: string;
}

export interface TehsilItem {
  id: number;
  district_id: number;
  tehsil_name: string;
  district_name?: string;
}

export interface VillageItem {
  id: number;
  district_id: number;
  tehsil_id: number;
  village_name: string;
  has_patwari?: number;
  mapped_patwari_name?: string | null;
  district_name?: string;
  tehsil_name?: string;
}

export interface CaseRequestItem {
  id: number;
  request_id: string;
  court_id: number;
  district_id: number;
  tehsil_id: number;
  village_id: number;
  patwari_id: number;
  case_number: string;
  case_details: string;
  additional_instructions: string;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
  district_name: string;
  tehsil_name: string;
  village_name: string;
  court_name?: string;
  po_name?: string;
  po_phone?: string;
  patwari_name?: string;
  patwari_phone?: string;
  patwari_user_id?: string;
  report_count?: number;
}

export interface AttachmentMeta {
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface PatwariReportItem {
  id: number;
  request_id: number;
  patwari_id: number;
  version: number;
  report_date: string;
  findings: string;
  remarks: string;
  land_details: string;
  applicant_details: string;
  site_verification_details: string;
  revenue_record_details: string;
  other_info: string;
  attachments_json: string;
  status: string;
  correction_reason: string;
  submitted_at: string;
  patwari_name?: string;
  patwari_phone?: string;
}

export interface ReportHistoryItem {
  id: number;
  request_id: number;
  report_id: number | null;
  action: string;
  performed_by_user_id: string;
  performed_by_name: string;
  performed_by_role: string;
  comments: string;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  recipient_user_id: string;
  request_id: string | null;
  title: string;
  message: string;
  channel: string;
  is_read: number;
  created_at: string;
}

export interface AdminOverviewData {
  kpis: {
    totalCourts: number;
    totalPatwaris: number;
    totalRequests: number;
    pendingRequests: number;
    reportsSubmitted: number;
    reportsAwaitingResponse: number;
    closedCases: number;
  };
  statusBreakdown: Array<{ status: string; count: number }>;
  districtWise: Array<Record<string, unknown>>;
  tehsilWise: Array<Record<string, unknown>>;
  villageWise: Array<Record<string, unknown>>;
  courtWise: Array<Record<string, unknown>>;
  patwariWise: Array<Record<string, unknown>>;
  trend: Array<{ period: string; requests: number; completed: number }>;
}
