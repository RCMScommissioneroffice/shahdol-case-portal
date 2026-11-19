import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { db, UPLOAD_DIR } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';
import { dispatchNotification, logAudit } from '../services/notificationService';

export const patwariRoutes = Router();

patwariRoutes.use(requireAuth, requireRole('PATWARI'));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeBase = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safeBase}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, PNG, WEBP, or TXT files are allowed.'));
    }
  }
});

patwariRoutes.get('/requests', (req, res) => {
  const patwari = req.authUser!.patwariProfile!;
  const statusFilter = req.query.status ? String(req.query.status) : '';
  const search = req.query.q ? String(req.query.q).trim().toLowerCase() : '';

  let sql = `
    SELECT cr.id, cr.request_id, cr.case_number, cr.case_details, cr.additional_instructions,
           cr.status, cr.created_at, cr.updated_at,
           d.district_name, t.tehsil_name, v.village_name,
           c.court_name, c.po_name, c.po_phone
    FROM case_requests cr
    JOIN districts d ON d.id = cr.district_id
    JOIN tehsils t ON t.id = cr.tehsil_id
    JOIN villages v ON v.id = cr.village_id
    JOIN courts c ON c.id = cr.court_id
    WHERE cr.patwari_id = ?
      AND cr.district_id = ?
      AND cr.tehsil_id = ?
      AND cr.village_id = ?
  `;
  const params: unknown[] = [patwari.id, patwari.district_id, patwari.tehsil_id, patwari.village_id];

  if (statusFilter && statusFilter !== 'ALL') {
    sql += ` AND cr.status = ?`;
    params.push(statusFilter);
  }

  if (search) {
    sql += ` AND (
      LOWER(cr.request_id) LIKE ? OR
      LOWER(cr.case_number) LIKE ? OR
      LOWER(c.court_name) LIKE ? OR
      LOWER(cr.case_details) LIKE ? OR
      LOWER(cr.status) LIKE ?
    )`;
    const like = `%${search}%`;
    params.push(like, like, like, like, like);
  }

  sql += ` ORDER BY cr.updated_at DESC, cr.id DESC`;

  const requests = db.prepare(sql).all(...params);
  res.json({ requests });
});

patwariRoutes.get('/requests/:requestId', (req, res) => {
  const patwari = req.authUser!.patwariProfile!;
  const requestIdParam = String(req.params.requestId);

  const requestRow = db
    .prepare(
      `SELECT cr.*, d.district_name, t.tehsil_name, v.village_name,
              c.court_name, c.po_name, c.po_phone, c.user_id AS court_user_id,
              p.patwari_name, p.patwari_phone
       FROM case_requests cr
       JOIN districts d ON d.id = cr.district_id
       JOIN tehsils t ON t.id = cr.tehsil_id
       JOIN villages v ON v.id = cr.village_id
       JOIN courts c ON c.id = cr.court_id
       JOIN patwaris p ON p.id = cr.patwari_id
       WHERE cr.request_id = ?`
    )
    .get(requestIdParam) as Record<string, unknown> | undefined;

  if (!requestRow) {
    res.status(404).json({ error: 'Case request not found.' });
    return;
  }

  // Strict RBAC check: Patwari can ONLY access cases mapped to their own ID and Village
  if (
    Number(requestRow.patwari_id) !== patwari.id ||
    Number(requestRow.village_id) !== patwari.village_id
  ) {
    logAudit(
      req.authUser!.userId,
      'PATWARI',
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      'CASE_REQUEST',
      requestIdParam,
      'Attempted cross-patwari URL access'
    );
    res.status(403).json({
      error: 'Access denied. You are only authorized to access requests assigned to your registered Village.'
    });
    return;
  }

  // Automatically record first view by Patwari
  if (requestRow.status === 'Pending') {
    const viewTx = db.transaction(() => {
      db.prepare(
        `UPDATE case_requests SET status = 'Viewed by Patwari', updated_at = datetime('now') WHERE id = ?`
      ).run(requestRow.id);
      db.prepare(
        `INSERT INTO report_history (
          request_id, report_id, action, performed_by_user_id, performed_by_name, performed_by_role, comments
        ) VALUES (?, NULL, 'Viewed by Patwari', ?, ?, 'PATWARI', 'Patwari opened the case request.')`
      ).run(requestRow.id, req.authUser!.userId, patwari.patwari_name);
    });
    viewTx();
    requestRow.status = 'Viewed by Patwari';
  }

  const reports = db
    .prepare(
      `SELECT * FROM patwari_reports WHERE request_id = ? ORDER BY version DESC, id DESC`
    )
    .all(requestRow.id);

  const history = db
    .prepare(`SELECT * FROM report_history WHERE request_id = ? ORDER BY created_at ASC, id ASC`)
    .all(requestRow.id);

  res.json({ request: requestRow, reports, history });
});

patwariRoutes.patch('/requests/:requestId/status', (req, res) => {
  const patwari = req.authUser!.patwariProfile!;
  const requestIdParam = String(req.params.requestId);
  const { status } = req.body || {};

  if (status !== 'Report in Progress') {
    res.status(400).json({ error: 'Invalid status transition.' });
    return;
  }

  const requestRow = db
    .prepare(`SELECT id, patwari_id, village_id, status FROM case_requests WHERE request_id = ?`)
    .get(requestIdParam) as { id: number; patwari_id: number; village_id: number; status: string } | undefined;

  if (!requestRow) {
    res.status(404).json({ error: 'Case request not found.' });
    return;
  }

  if (requestRow.patwari_id !== patwari.id || requestRow.village_id !== patwari.village_id) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  if (!['Pending', 'Viewed by Patwari', 'Returned for Correction'].includes(requestRow.status)) {
    res.status(400).json({ error: 'Status cannot be changed to Report in Progress from current state.' });
    return;
  }

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE case_requests SET status = 'Report in Progress', updated_at = datetime('now') WHERE id = ?`
    ).run(requestRow.id);
    db.prepare(
      `INSERT INTO report_history (
        request_id, report_id, action, performed_by_user_id, performed_by_name, performed_by_role, comments
      ) VALUES (?, NULL, 'Status Updated: Report in Progress', ?, ?, 'PATWARI', 'Field verification and report preparation in progress.')`
    ).run(requestRow.id, req.authUser!.userId, patwari.patwari_name);
    logAudit(req.authUser!.userId, 'PATWARI', 'STATUS_IN_PROGRESS', 'CASE_REQUEST', requestIdParam);
  });

  tx();

  res.json({ message: 'Status updated to Report in Progress.' });
});

patwariRoutes.post('/requests/:requestId/report', upload.array('attachments', 5), async (req, res) => {
  const patwari = req.authUser!.patwariProfile!;
  const requestIdParam = String(req.params.requestId);

  const {
    reportDate,
    findings,
    remarks,
    landDetails,
    applicantDetails,
    siteVerificationDetails,
    revenueRecordDetails,
    otherInfo
  } = req.body || {};

  if (!reportDate?.trim() || !findings?.trim() || !remarks?.trim()) {
    res.status(400).json({
      error: 'Report Date, Current Status / Findings, and Patwari Report / Remarks are mandatory.'
    });
    return;
  }

  const requestRow = db
    .prepare(
      `SELECT cr.*, c.user_id AS court_user_id, c.po_phone AS court_phone, c.court_name
       FROM case_requests cr
       JOIN courts c ON c.id = cr.court_id
       WHERE cr.request_id = ?`
    )
    .get(requestIdParam) as
    | {
        id: number;
        patwari_id: number;
        village_id: number;
        status: string;
        case_number: string;
        court_user_id: string;
        court_phone: string;
        court_name: string;
      }
    | undefined;

  if (!requestRow) {
    res.status(404).json({ error: 'Case request not found.' });
    return;
  }

  if (requestRow.patwari_id !== patwari.id || requestRow.village_id !== patwari.village_id) {
    res.status(403).json({ error: 'Access denied. You cannot submit reports for another Patwari.' });
    return;
  }

  if (requestRow.status === 'Closed') {
    res.status(400).json({ error: 'This case is already Closed and cannot be modified.' });
    return;
  }

  const uploadedFiles = ((req.files as Express.Multer.File[]) || []).map((f) => ({
    originalName: f.originalname,
    filename: f.filename,
    mimeType: f.mimetype,
    size: f.size
  }));

  const maxVerRow = db
    .prepare(`SELECT COALESCE(MAX(version), 0) AS max_ver FROM patwari_reports WHERE request_id = ?`)
    .get(requestRow.id) as { max_ver: number };

  const nextVersion = maxVerRow.max_ver + 1;
  const isResubmission = nextVersion > 1;
  const nextCaseStatus = isResubmission ? 'Report Resubmitted' : 'Report Submitted';
  const nextReportStatus = isResubmission ? 'Resubmitted' : 'Submitted';

  const tx = db.transaction(() => {
    const insertRep = db
      .prepare(
        `INSERT INTO patwari_reports (
          request_id, patwari_id, version, report_date, findings, remarks,
          land_details, applicant_details, site_verification_details, revenue_record_details,
          other_info, attachments_json, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        requestRow.id,
        patwari.id,
        nextVersion,
        String(reportDate).trim(),
        String(findings).trim(),
        String(remarks).trim(),
        String(landDetails || '').trim(),
        String(applicantDetails || '').trim(),
        String(siteVerificationDetails || '').trim(),
        String(revenueRecordDetails || '').trim(),
        String(otherInfo || '').trim(),
        JSON.stringify(uploadedFiles),
        nextReportStatus
      );

    const reportNumericId = Number(insertRep.lastInsertRowid);

    db.prepare(`UPDATE case_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(
      nextCaseStatus,
      requestRow.id
    );

    db.prepare(
      `INSERT INTO report_history (
        request_id, report_id, action, performed_by_user_id, performed_by_name, performed_by_role, comments
      ) VALUES (?, ?, ?, ?, ?, 'PATWARI', ?)`
    ).run(
      requestRow.id,
      reportNumericId,
      isResubmission ? `Report Resubmitted (v${nextVersion})` : `Report Submitted (v${nextVersion})`,
      req.authUser!.userId,
      patwari.patwari_name,
      String(findings).trim()
    );

    logAudit(
      req.authUser!.userId,
      'PATWARI',
      isResubmission ? 'REPORT_RESUBMITTED' : 'REPORT_SUBMITTED',
      'CASE_REQUEST',
      requestIdParam,
      `Version ${nextVersion}`
    );

    return reportNumericId;
  });

  tx();

  await dispatchNotification({
    recipientUserId: requestRow.court_user_id,
    requestId: requestIdParam,
    title: isResubmission ? 'Patwari Report Resubmitted' : 'Patwari Report Submitted',
    message: isResubmission
      ? `Patwari has resubmitted the corrected report for Request ID ${requestIdParam}.`
      : `Patwari has submitted the report for Request ID ${requestIdParam}.`,
    phone: requestRow.court_phone
  });

  res.status(201).json({
    message: isResubmission ? 'Corrected report resubmitted to Court.' : 'Report submitted to Court successfully.',
    status: nextCaseStatus,
    version: nextVersion
  });
});
