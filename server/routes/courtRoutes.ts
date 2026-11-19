import { Router } from 'express';
import { db, generateRequestId } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';
import { dispatchNotification, logAudit } from '../services/notificationService';

export const courtRoutes = Router();

courtRoutes.use(requireAuth, requireRole('COURT'));

// Lookup mapped Patwari strictly via District -> Tehsil -> Village
courtRoutes.get('/patwari-by-village/:villageId', (req, res) => {
  const villageId = Number(req.params.villageId);
  const patwari = db
    .prepare(
      `SELECT p.id, p.user_id, p.patwari_name, p.patwari_phone,
              v.village_name, t.tehsil_name, d.district_name, u.status
       FROM patwaris p
       JOIN villages v ON v.id = p.village_id
       JOIN tehsils t ON t.id = p.tehsil_id
       JOIN districts d ON d.id = p.district_id
       JOIN users u ON u.user_id = p.user_id
       WHERE p.village_id = ? AND u.status = 'ACTIVE'`
    )
    .get(villageId) as
    | {
        id: number;
        user_id: string;
        patwari_name: string;
        patwari_phone: string;
        village_name: string;
        tehsil_name: string;
        district_name: string;
        status: string;
      }
    | undefined;

  if (!patwari) {
    res.status(404).json({
      error: 'No active Patwari is currently mapped to this village. Please select another village or contact the Administrator.'
    });
    return;
  }

  res.json({ patwari });
});

courtRoutes.get('/requests', (req, res) => {
  const court = req.authUser!.courtProfile!;
  const statusFilter = req.query.status ? String(req.query.status) : '';
  const search = req.query.q ? String(req.query.q).trim().toLowerCase() : '';

  let sql = `
    SELECT cr.id, cr.request_id, cr.case_number, cr.case_details, cr.additional_instructions,
           cr.status, cr.created_at, cr.updated_at,
           d.district_name, t.tehsil_name, v.village_name,
           p.patwari_name, p.patwari_phone, p.user_id AS patwari_user_id,
           (SELECT COUNT(*) FROM patwari_reports pr WHERE pr.request_id = cr.id) AS report_count
    FROM case_requests cr
    JOIN districts d ON d.id = cr.district_id
    JOIN tehsils t ON t.id = cr.tehsil_id
    JOIN villages v ON v.id = cr.village_id
    JOIN patwaris p ON p.id = cr.patwari_id
    WHERE cr.court_id = ?
  `;
  const params: unknown[] = [court.id];

  if (statusFilter && statusFilter !== 'ALL') {
    sql += ` AND cr.status = ?`;
    params.push(statusFilter);
  }

  if (search) {
    sql += ` AND (
      LOWER(cr.request_id) LIKE ? OR
      LOWER(cr.case_number) LIKE ? OR
      LOWER(v.village_name) LIKE ? OR
      LOWER(t.tehsil_name) LIKE ? OR
      LOWER(d.district_name) LIKE ? OR
      LOWER(p.patwari_name) LIKE ? OR
      LOWER(cr.status) LIKE ?
    )`;
    const like = `%${search}%`;
    params.push(like, like, like, like, like, like, like);
  }

  sql += ` ORDER BY cr.created_at DESC, cr.id DESC`;

  const requests = db.prepare(sql).all(...params);
  res.json({ requests });
});

courtRoutes.post('/requests', async (req, res) => {
  const court = req.authUser!.courtProfile!;
  const { districtId, tehsilId, villageId, caseNumber, caseDetails, additionalInstructions } = req.body || {};

  const targetDistrictId = Number(districtId || court.district_id);
  const targetTehsilId = Number(tehsilId);
  const targetVillageId = Number(villageId);

  if (!targetDistrictId || !targetTehsilId || !targetVillageId || !caseNumber?.trim() || !caseDetails?.trim()) {
    res.status(400).json({
      error: 'District, Tehsil, Village, Case Number, and Case Details are mandatory.'
    });
    return;
  }

  const locationRow = db
    .prepare(
      `SELECT v.id AS village_id, v.village_name,
              t.id AS tehsil_id, t.tehsil_name,
              d.id AS district_id, d.district_name, d.code AS district_code
       FROM villages v
       JOIN tehsils t ON t.id = v.tehsil_id
       JOIN districts d ON d.id = v.district_id
       WHERE v.id = ? AND t.id = ? AND d.id = ?`
    )
    .get(targetVillageId, targetTehsilId, targetDistrictId) as
    | {
        village_id: number;
        village_name: string;
        tehsil_id: number;
        tehsil_name: string;
        district_id: number;
        district_name: string;
        district_code: string;
      }
    | undefined;

  if (!locationRow) {
    res.status(400).json({ error: 'Selected District → Tehsil → Village hierarchy is invalid.' });
    return;
  }

  // Server-authoritative mapping: District -> Tehsil -> Village -> Patwari
  const mappedPatwari = db
    .prepare(
      `SELECT p.id, p.user_id, p.patwari_name, p.patwari_phone
       FROM patwaris p
       JOIN users u ON u.user_id = p.user_id
       WHERE p.district_id = ? AND p.tehsil_id = ? AND p.village_id = ? AND u.status = 'ACTIVE'`
    )
    .get(locationRow.district_id, locationRow.tehsil_id, locationRow.village_id) as
    | { id: number; user_id: string; patwari_name: string; patwari_phone: string }
    | undefined;

  if (!mappedPatwari) {
    res.status(400).json({
      error: `No active Patwari is mapped to Village ${locationRow.village_name} (${locationRow.tehsil_name}).`
    });
    return;
  }

  const requestId = generateRequestId(locationRow.district_code);
  const cleanCaseNumber = String(caseNumber).trim();
  const cleanDetails = String(caseDetails).trim();
  const cleanInstructions = String(additionalInstructions || '').trim();

  const tx = db.transaction(() => {
    const insertRes = db
      .prepare(
        `INSERT INTO case_requests (
          request_id, court_id, district_id, tehsil_id, village_id, patwari_id,
          case_number, case_details, additional_instructions, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`
      )
      .run(
        requestId,
        court.id,
        locationRow.district_id,
        locationRow.tehsil_id,
        locationRow.village_id,
        mappedPatwari.id,
        cleanCaseNumber,
        cleanDetails,
        cleanInstructions
      );

    const caseNumericId = Number(insertRes.lastInsertRowid);

    db.prepare(
      `INSERT INTO report_history (
        request_id, report_id, action, performed_by_user_id, performed_by_name, performed_by_role, comments
      ) VALUES (?, NULL, 'Request Created & Assigned', ?, ?, 'COURT', ?)`
    ).run(
      caseNumericId,
      req.authUser!.userId,
      court.po_name,
      `Assigned to Patwari ${mappedPatwari.patwari_name} (${locationRow.village_name}, ${locationRow.tehsil_name})`
    );

    logAudit(
      req.authUser!.userId,
      'COURT',
      'CASE_REQUEST_CREATED',
      'CASE_REQUEST',
      requestId,
      `Case ${cleanCaseNumber} mapped to ${mappedPatwari.user_id}`
    );

    return caseNumericId;
  });

  tx();

  await dispatchNotification({
    recipientUserId: mappedPatwari.user_id,
    requestId,
    title: 'New Report Request Received',
    message: `New report request received from ${court.court_name} for Case ${cleanCaseNumber} (${locationRow.village_name}). Request ID: ${requestId}`,
    phone: mappedPatwari.patwari_phone
  });

  res.status(201).json({
    message: 'Report request sent to mapped Patwari.',
    requestId,
    mappedPatwari
  });
});

courtRoutes.get('/requests/:requestId', (req, res) => {
  const court = req.authUser!.courtProfile!;
  const requestIdParam = String(req.params.requestId);

  const requestRow = db
    .prepare(
      `SELECT cr.*, d.district_name, t.tehsil_name, v.village_name,
              c.court_name, c.po_name, c.po_phone,
              p.patwari_name, p.patwari_phone, p.user_id AS patwari_user_id
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

  if (Number(requestRow.court_id) !== court.id) {
    logAudit(req.authUser!.userId, 'COURT', 'UNAUTHORIZED_ACCESS_ATTEMPT', 'CASE_REQUEST', requestIdParam, 'Attempted to view another court request');
    res.status(403).json({ error: 'Access denied. You may only view requests created by your Court.' });
    return;
  }

  const reports = db
    .prepare(
      `SELECT pr.*, p.patwari_name, p.patwari_phone
       FROM patwari_reports pr
       JOIN patwaris p ON p.id = pr.patwari_id
       WHERE pr.request_id = ?
       ORDER BY pr.version DESC, pr.id DESC`
    )
    .all(requestRow.id);

  const history = db
    .prepare(
      `SELECT * FROM report_history WHERE request_id = ? ORDER BY created_at ASC, id ASC`
    )
    .all(requestRow.id);

  res.json({ request: requestRow, reports, history });
});

courtRoutes.post('/requests/:requestId/accept', async (req, res) => {
  const court = req.authUser!.courtProfile!;
  const requestIdParam = String(req.params.requestId);
  const { remarks } = req.body || {};

  const requestRow = db
    .prepare(
      `SELECT cr.*, p.user_id AS patwari_user_id, p.patwari_phone
       FROM case_requests cr
       JOIN patwaris p ON p.id = cr.patwari_id
       WHERE cr.request_id = ?`
    )
    .get(requestIdParam) as
    | { id: number; court_id: number; status: string; patwari_user_id: string; patwari_phone: string }
    | undefined;

  if (!requestRow) {
    res.status(404).json({ error: 'Case request not found.' });
    return;
  }

  if (requestRow.court_id !== court.id) {
    res.status(403).json({ error: 'Access denied. Only the originating Court can accept this report.' });
    return;
  }

  if (!['Report Submitted', 'Report Resubmitted'].includes(requestRow.status)) {
    res.status(400).json({ error: 'Only submitted or resubmitted reports can be accepted.' });
    return;
  }

  const latestReport = db
    .prepare(`SELECT id FROM patwari_reports WHERE request_id = ? ORDER BY version DESC LIMIT 1`)
    .get(requestRow.id) as { id: number } | undefined;

  if (!latestReport) {
    res.status(400).json({ error: 'No Patwari report found to accept.' });
    return;
  }

  const commentText = String(remarks || 'Report accepted and taken on court record.').trim();

  const tx = db.transaction(() => {
    db.prepare(`UPDATE case_requests SET status = 'Closed', updated_at = datetime('now') WHERE id = ?`).run(
      requestRow.id
    );
    db.prepare(`UPDATE patwari_reports SET status = 'Accepted' WHERE id = ?`).run(latestReport.id);
    db.prepare(
      `INSERT INTO report_history (
        request_id, report_id, action, performed_by_user_id, performed_by_name, performed_by_role, comments
      ) VALUES (?, ?, 'Report Accepted & Case Closed', ?, ?, 'COURT', ?)`
    ).run(requestRow.id, latestReport.id, req.authUser!.userId, court.po_name, commentText);

    logAudit(req.authUser!.userId, 'COURT', 'REPORT_ACCEPTED', 'CASE_REQUEST', requestIdParam, commentText);
  });

  tx();

  await dispatchNotification({
    recipientUserId: requestRow.patwari_user_id,
    requestId: requestIdParam,
    title: 'Report Accepted & Case Closed',
    message: `${court.court_name} accepted your report for Request ID ${requestIdParam}. Case is now Closed.`,
    phone: requestRow.patwari_phone
  });

  res.json({ message: 'Report accepted and case closed successfully.' });
});

courtRoutes.post('/requests/:requestId/return', async (req, res) => {
  const court = req.authUser!.courtProfile!;
  const requestIdParam = String(req.params.requestId);
  const { reason } = req.body || {};

  if (!reason || !String(reason).trim()) {
    res.status(400).json({ error: 'Reason for Correction is mandatory when returning a report.' });
    return;
  }

  const cleanReason = String(reason).trim();

  const requestRow = db
    .prepare(
      `SELECT cr.*, p.user_id AS patwari_user_id, p.patwari_phone
       FROM case_requests cr
       JOIN patwaris p ON p.id = cr.patwari_id
       WHERE cr.request_id = ?`
    )
    .get(requestIdParam) as
    | { id: number; court_id: number; status: string; patwari_user_id: string; patwari_phone: string }
    | undefined;

  if (!requestRow) {
    res.status(404).json({ error: 'Case request not found.' });
    return;
  }

  if (requestRow.court_id !== court.id) {
    res.status(403).json({ error: 'Access denied. Only the originating Court can return this report.' });
    return;
  }

  if (!['Report Submitted', 'Report Resubmitted'].includes(requestRow.status)) {
    res.status(400).json({ error: 'Only submitted or resubmitted reports can be returned for correction.' });
    return;
  }

  const latestReport = db
    .prepare(`SELECT id FROM patwari_reports WHERE request_id = ? ORDER BY version DESC LIMIT 1`)
    .get(requestRow.id) as { id: number } | undefined;

  if (!latestReport) {
    res.status(400).json({ error: 'No Patwari report found to return.' });
    return;
  }

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE case_requests SET status = 'Returned for Correction', updated_at = datetime('now') WHERE id = ?`
    ).run(requestRow.id);

    db.prepare(
      `UPDATE patwari_reports SET status = 'Returned for Correction', correction_reason = ? WHERE id = ?`
    ).run(cleanReason, latestReport.id);

    db.prepare(
      `INSERT INTO report_history (
        request_id, report_id, action, performed_by_user_id, performed_by_name, performed_by_role, comments
      ) VALUES (?, ?, 'Returned for Correction', ?, ?, 'COURT', ?)`
    ).run(requestRow.id, latestReport.id, req.authUser!.userId, court.po_name, cleanReason);

    logAudit(req.authUser!.userId, 'COURT', 'REPORT_RETURNED', 'CASE_REQUEST', requestIdParam, cleanReason);
  });

  tx();

  await dispatchNotification({
    recipientUserId: requestRow.patwari_user_id,
    requestId: requestIdParam,
    title: 'Report Correction Requested',
    message: `Report correction requested by ${court.court_name} for Request ID ${requestIdParam}: ${cleanReason}`,
    phone: requestRow.patwari_phone
  });

  res.json({ message: 'Report returned to Patwari for correction.' });
});
