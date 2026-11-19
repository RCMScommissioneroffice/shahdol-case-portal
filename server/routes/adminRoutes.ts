import { Router } from 'express';
import { db } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';
import { logAudit } from '../services/notificationService';
import { buildSourceZipBuffer } from '../utils/zipBuilder';

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireRole('ADMIN'));

adminRoutes.get('/overview', (_req, res) => {
  const kpis = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM courts c JOIN users u ON u.user_id = c.user_id WHERE u.status = 'ACTIVE') AS totalCourts,
        (SELECT COUNT(*) FROM patwaris p JOIN users u ON u.user_id = p.user_id WHERE u.status = 'ACTIVE') AS totalPatwaris,
        (SELECT COUNT(*) FROM case_requests) AS totalRequests,
        (SELECT COUNT(*) FROM case_requests WHERE status IN ('Pending', 'Viewed by Patwari', 'Report in Progress')) AS pendingRequests,
        (SELECT COUNT(*) FROM case_requests WHERE status IN ('Report Submitted', 'Report Resubmitted', 'Closed')) AS reportsSubmitted,
        (SELECT COUNT(*) FROM case_requests WHERE status IN ('Report Submitted', 'Report Resubmitted')) AS reportsAwaitingResponse,
        (SELECT COUNT(*) FROM case_requests WHERE status = 'Closed') AS closedCases`
    )
    .get();

  const statusBreakdown = db
    .prepare(`SELECT status, COUNT(*) AS count FROM case_requests GROUP BY status`)
    .all();

  const districtWise = db
    .prepare(
      `SELECT d.id, d.district_name AS name,
              COUNT(cr.id) AS totalRequests,
              SUM(CASE WHEN cr.status IN ('Pending', 'Viewed by Patwari') THEN 1 ELSE 0 END) AS pending,
              SUM(CASE WHEN cr.status = 'Report in Progress' THEN 1 ELSE 0 END) AS inProgress,
              SUM(CASE WHEN cr.status IN ('Report Submitted', 'Report Resubmitted') THEN 1 ELSE 0 END) AS submitted,
              SUM(CASE WHEN cr.status = 'Returned for Correction' THEN 1 ELSE 0 END) AS returned,
              SUM(CASE WHEN cr.status = 'Closed' THEN 1 ELSE 0 END) AS closed
       FROM districts d
       LEFT JOIN case_requests cr ON cr.district_id = d.id
       GROUP BY d.id
       ORDER BY d.id ASC`
    )
    .all();

  const tehsilWise = db
    .prepare(
      `SELECT t.id, t.tehsil_name AS name, d.district_name AS district,
              COUNT(cr.id) AS totalRequests,
              SUM(CASE WHEN cr.status IN ('Pending', 'Viewed by Patwari') THEN 1 ELSE 0 END) AS pending,
              SUM(CASE WHEN cr.status = 'Report in Progress' THEN 1 ELSE 0 END) AS inProgress,
              SUM(CASE WHEN cr.status IN ('Report Submitted', 'Report Resubmitted') THEN 1 ELSE 0 END) AS submitted,
              SUM(CASE WHEN cr.status = 'Closed' THEN 1 ELSE 0 END) AS closed
       FROM tehsils t
       JOIN districts d ON d.id = t.district_id
       LEFT JOIN case_requests cr ON cr.tehsil_id = t.id
       GROUP BY t.id
       HAVING totalRequests > 0
       ORDER BY totalRequests DESC, t.tehsil_name ASC`
    )
    .all();

  const villageWise = db
    .prepare(
      `SELECT v.id, v.village_name AS name, t.tehsil_name AS tehsil, d.district_name AS district,
              COUNT(cr.id) AS totalRequests,
              SUM(CASE WHEN cr.status IN ('Pending', 'Viewed by Patwari') THEN 1 ELSE 0 END) AS pending,
              SUM(CASE WHEN cr.status = 'Report in Progress' THEN 1 ELSE 0 END) AS inProgress,
              SUM(CASE WHEN cr.status IN ('Report Submitted', 'Report Resubmitted') THEN 1 ELSE 0 END) AS submitted,
              SUM(CASE WHEN cr.status = 'Closed' THEN 1 ELSE 0 END) AS closed
       FROM villages v
       JOIN tehsils t ON t.id = v.tehsil_id
       JOIN districts d ON d.id = v.district_id
       LEFT JOIN case_requests cr ON cr.village_id = v.id
       GROUP BY v.id
       HAVING totalRequests > 0
       ORDER BY totalRequests DESC, v.village_name ASC`
    )
    .all();

  const courtWise = db
    .prepare(
      `SELECT c.id, c.user_id, c.court_name AS name, d.district_name AS district, t.tehsil_name AS tehsil,
              COUNT(cr.id) AS requestsSent,
              SUM(CASE WHEN cr.status IN ('Report Submitted', 'Report Resubmitted', 'Closed') THEN 1 ELSE 0 END) AS reportsReceived,
              SUM(CASE WHEN cr.status IN ('Pending', 'Viewed by Patwari', 'Report in Progress', 'Returned for Correction') THEN 1 ELSE 0 END) AS pending
       FROM courts c
       JOIN districts d ON d.id = c.district_id
       JOIN tehsils t ON t.id = c.tehsil_id
       LEFT JOIN case_requests cr ON cr.court_id = c.id
       GROUP BY c.id
       ORDER BY requestsSent DESC`
    )
    .all();

  const patwariWise = db
    .prepare(
      `SELECT p.id, p.user_id, p.patwari_name AS name, v.village_name AS village, t.tehsil_name AS tehsil, d.district_name AS district,
              COUNT(cr.id) AS requestsReceived,
              SUM(CASE WHEN cr.status IN ('Report Submitted', 'Report Resubmitted', 'Closed') THEN 1 ELSE 0 END) AS reportsSubmitted,
              SUM(CASE WHEN cr.status IN ('Pending', 'Viewed by Patwari', 'Report in Progress') THEN 1 ELSE 0 END) AS pending,
              SUM(CASE WHEN cr.status = 'Returned for Correction' THEN 1 ELSE 0 END) AS correctionRequired
       FROM patwaris p
       JOIN villages v ON v.id = p.village_id
       JOIN tehsils t ON t.id = p.tehsil_id
       JOIN districts d ON d.id = p.district_id
       LEFT JOIN case_requests cr ON cr.patwari_id = p.id
       GROUP BY p.id
       ORDER BY requestsReceived DESC`
    )
    .all();

  const trend = db
    .prepare(
      `SELECT substr(created_at, 1, 7) AS period,
              COUNT(*) AS requests,
              SUM(CASE WHEN status IN ('Report Submitted', 'Report Resubmitted', 'Closed') THEN 1 ELSE 0 END) AS completed
       FROM case_requests
       GROUP BY substr(created_at, 1, 7)
       ORDER BY period ASC`
    )
    .all();

  res.json({
    kpis,
    statusBreakdown,
    districtWise,
    tehsilWise,
    villageWise,
    courtWise,
    patwariWise,
    trend
  });
});

adminRoutes.get('/users', (_req, res) => {
  const users = db
    .prepare(
      `SELECT u.id, u.user_id, u.role, u.name, u.phone, u.status, u.created_at,
              c.court_name, d1.district_name AS court_district, t1.tehsil_name AS court_tehsil,
              p.patwari_name, d2.district_name AS patwari_district, t2.tehsil_name AS patwari_tehsil, v2.village_name AS patwari_village
       FROM users u
       LEFT JOIN courts c ON c.user_id = u.user_id
       LEFT JOIN districts d1 ON d1.id = c.district_id
       LEFT JOIN tehsils t1 ON t1.id = c.tehsil_id
       LEFT JOIN patwaris p ON p.user_id = u.user_id
       LEFT JOIN districts d2 ON d2.id = p.district_id
       LEFT JOIN tehsils t2 ON t2.id = p.tehsil_id
       LEFT JOIN villages v2 ON v2.id = p.village_id
       ORDER BY u.created_at DESC, u.id DESC`
    )
    .all();

  res.json({ users });
});

adminRoutes.patch('/users/:userId/status', (req, res) => {
  const targetUserId = String(req.params.userId);
  const { status } = req.body || {};

  if (!['ACTIVE', 'INACTIVE'].includes(status)) {
    res.status(400).json({ error: 'Status must be ACTIVE or INACTIVE.' });
    return;
  }

  if (targetUserId === req.authUser!.userId && status === 'INACTIVE') {
    res.status(400).json({ error: 'You cannot deactivate your own Administrator account.' });
    return;
  }

  const info = db.prepare(`UPDATE users SET status = ? WHERE user_id = ?`).run(status, targetUserId);
  if (info.changes === 0) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  logAudit(req.authUser!.userId, 'ADMIN', 'USER_STATUS_UPDATED', 'USER', targetUserId, `Changed status to ${status}`);
  res.json({ message: `User ${targetUserId} is now ${status}.` });
});

adminRoutes.get('/master-data', (_req, res) => {
  const districts = db.prepare(`SELECT * FROM districts ORDER BY id ASC`).all();
  const tehsils = db
    .prepare(
      `SELECT t.*, d.district_name FROM tehsils t JOIN districts d ON d.id = t.district_id ORDER BY d.district_name, t.tehsil_name`
    )
    .all();
  const villages = db
    .prepare(
      `SELECT v.*, d.district_name, t.tehsil_name,
              p.id AS patwari_id, p.user_id AS patwari_user_id, p.patwari_name, p.patwari_phone
       FROM villages v
       JOIN districts d ON d.id = v.district_id
       JOIN tehsils t ON t.id = v.tehsil_id
       LEFT JOIN patwaris p ON p.village_id = v.id
       ORDER BY d.district_name, t.tehsil_name, v.village_name`
    )
    .all();
  const courts = db
    .prepare(
      `SELECT c.*, d.district_name, t.tehsil_name, u.status
       FROM courts c
       JOIN districts d ON d.id = c.district_id
       JOIN tehsils t ON t.id = c.tehsil_id
       JOIN users u ON u.user_id = c.user_id
       ORDER BY d.district_name, c.court_name`
    )
    .all();
  const patwaris = db
    .prepare(
      `SELECT p.*, d.district_name, t.tehsil_name, v.village_name, u.status
       FROM patwaris p
       JOIN districts d ON d.id = p.district_id
       JOIN tehsils t ON t.id = p.tehsil_id
       JOIN villages v ON v.id = p.village_id
       JOIN users u ON u.user_id = p.user_id
       ORDER BY d.district_name, p.patwari_name`
    )
    .all();

  res.json({ districts, tehsils, villages, courts, patwaris });
});

adminRoutes.post('/districts', (req, res) => {
  const { districtName, code } = req.body || {};
  if (!districtName?.trim() || !code?.trim()) {
    res.status(400).json({ error: 'District name and 3-letter code are required.' });
    return;
  }
  const cleanName = String(districtName).trim();
  const cleanCode = String(code).trim().toUpperCase().slice(0, 4);
  try {
    const info = db.prepare(`INSERT INTO districts (district_name, code) VALUES (?, ?)`).run(cleanName, cleanCode);
    logAudit(req.authUser!.userId, 'ADMIN', 'DISTRICT_CREATED', 'DISTRICT', cleanCode, cleanName);
    res.status(201).json({ id: info.lastInsertRowid, district_name: cleanName, code: cleanCode });
  } catch {
    res.status(409).json({ error: 'District name or code already exists.' });
  }
});

adminRoutes.post('/tehsils', (req, res) => {
  const { districtId, tehsilName } = req.body || {};
  if (!districtId || !tehsilName?.trim()) {
    res.status(400).json({ error: 'District and Tehsil name are required.' });
    return;
  }
  const cleanName = String(tehsilName).trim();
  try {
    const info = db
      .prepare(`INSERT INTO tehsils (district_id, tehsil_name) VALUES (?, ?)`)
      .run(Number(districtId), cleanName);
    logAudit(req.authUser!.userId, 'ADMIN', 'TEHSIL_CREATED', 'TEHSIL', String(info.lastInsertRowid), cleanName);
    res.status(201).json({ id: info.lastInsertRowid, district_id: Number(districtId), tehsil_name: cleanName });
  } catch {
    res.status(409).json({ error: 'Tehsil already exists in this district.' });
  }
});

adminRoutes.post('/villages', (req, res) => {
  const { districtId, tehsilId, villageName } = req.body || {};
  if (!districtId || !tehsilId || !villageName?.trim()) {
    res.status(400).json({ error: 'District, Tehsil, and Village name are required.' });
    return;
  }
  const cleanName = String(villageName).trim();
  try {
    const info = db
      .prepare(`INSERT INTO villages (district_id, tehsil_id, village_name) VALUES (?, ?, ?)`)
      .run(Number(districtId), Number(tehsilId), cleanName);
    logAudit(req.authUser!.userId, 'ADMIN', 'VILLAGE_CREATED', 'VILLAGE', String(info.lastInsertRowid), cleanName);
    res.status(201).json({ id: info.lastInsertRowid, village_name: cleanName });
  } catch {
    res.status(409).json({ error: 'Village already exists in this tehsil.' });
  }
});

adminRoutes.post('/mappings/patwari-village', (req, res) => {
  const { patwariId, villageId } = req.body || {};
  if (!patwariId || !villageId) {
    res.status(400).json({ error: 'Patwari and Target Village are required.' });
    return;
  }

  const village = db
    .prepare(`SELECT id, district_id, tehsil_id, village_name FROM villages WHERE id = ?`)
    .get(Number(villageId)) as
    | { id: number; district_id: number; tehsil_id: number; village_name: string }
    | undefined;

  if (!village) {
    res.status(404).json({ error: 'Target village not found.' });
    return;
  }

  const occupied = db
    .prepare(`SELECT id, patwari_name FROM patwaris WHERE village_id = ? AND id != ?`)
    .get(village.id, Number(patwariId)) as { id: number; patwari_name: string } | undefined;

  if (occupied) {
    res.status(409).json({
      error: `Village ${village.village_name} is currently mapped to ${occupied.patwari_name}. Reassign that Patwari first.`
    });
    return;
  }

  const info = db
    .prepare(`UPDATE patwaris SET district_id = ?, tehsil_id = ?, village_id = ? WHERE id = ?`)
    .run(village.district_id, village.tehsil_id, village.id, Number(patwariId));

  if (info.changes === 0) {
    res.status(404).json({ error: 'Patwari record not found.' });
    return;
  }

  logAudit(
    req.authUser!.userId,
    'ADMIN',
    'PATWARI_VILLAGE_MAPPED',
    'PATWARI',
    String(patwariId),
    `Mapped to village ${village.village_name}`
  );
  res.json({ message: `Patwari mapped to Village ${village.village_name} successfully.` });
});

adminRoutes.get('/requests', (req, res) => {
  const search = req.query.q ? String(req.query.q).trim().toLowerCase() : '';
  const statusFilter = req.query.status ? String(req.query.status) : '';

  let sql = `
    SELECT cr.*, d.district_name, t.tehsil_name, v.village_name,
           c.court_name, c.po_name, p.patwari_name, p.patwari_phone,
           (SELECT COUNT(*) FROM patwari_reports pr WHERE pr.request_id = cr.id) AS report_count
    FROM case_requests cr
    JOIN districts d ON d.id = cr.district_id
    JOIN tehsils t ON t.id = cr.tehsil_id
    JOIN villages v ON v.id = cr.village_id
    JOIN courts c ON c.id = cr.court_id
    JOIN patwaris p ON p.id = cr.patwari_id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (statusFilter && statusFilter !== 'ALL') {
    sql += ` AND cr.status = ?`;
    params.push(statusFilter);
  }

  if (search) {
    sql += ` AND (
      LOWER(cr.request_id) LIKE ? OR
      LOWER(cr.case_number) LIKE ? OR
      LOWER(c.court_name) LIKE ? OR
      LOWER(p.patwari_name) LIKE ? OR
      LOWER(d.district_name) LIKE ? OR
      LOWER(t.tehsil_name) LIKE ? OR
      LOWER(v.village_name) LIKE ? OR
      LOWER(cr.status) LIKE ?
    )`;
    const like = `%${search}%`;
    params.push(like, like, like, like, like, like, like, like);
  }

  sql += ` ORDER BY cr.updated_at DESC, cr.id DESC`;
  const requests = db.prepare(sql).all(...params);
  res.json({ requests });
});

adminRoutes.get('/requests/:requestId', (req, res) => {
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
    .prepare(`SELECT * FROM report_history WHERE request_id = ? ORDER BY created_at ASC, id ASC`)
    .all(requestRow.id);

  res.json({ request: requestRow, reports, history });
});

adminRoutes.get('/audit-logs', (_req, res) => {
  const logs = db.prepare(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT 200`).all();
  res.json({ logs });
});

adminRoutes.get('/export-source', (req, res) => {
  try {
    const zipBuffer = buildSourceZipBuffer(process.cwd());
    logAudit(
      req.authUser!.userId,
      'ADMIN',
      'SOURCE_EXPORTED',
      'SYSTEM',
      'shahdol-division-portal.zip',
      `Exported ${zipBuffer.length} bytes`
    );
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="shahdol-division-portal.zip"');
    res.setHeader('Content-Length', String(zipBuffer.length));
    res.send(zipBuffer);
  } catch (err) {
    console.error('Source export failed:', err);
    res.status(500).json({ error: 'Failed to generate project source archive.' });
  }
});
