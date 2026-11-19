import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { db, UPLOAD_DIR } from '../db';
import { requireAuth } from '../middleware/auth';

export const sharedRoutes = Router();

sharedRoutes.use(requireAuth);

sharedRoutes.get('/notifications', (req, res) => {
  const notifications = db
    .prepare(
      `SELECT * FROM notifications WHERE recipient_user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50`
    )
    .all(req.authUser!.userId);
  res.json({ notifications });
});

sharedRoutes.patch('/notifications/:id/read', (req, res) => {
  const id = Number(req.params.id);
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_user_id = ?`).run(
    id,
    req.authUser!.userId
  );
  res.json({ message: 'Notification marked as read.' });
});

sharedRoutes.post('/notifications/read-all', (req, res) => {
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE recipient_user_id = ?`).run(
    req.authUser!.userId
  );
  res.json({ message: 'All notifications marked as read.' });
});

// Fast, role-scoped global search across Request ID, Case No, Court, Patwari, District, Tehsil, Village, Status
sharedRoutes.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) {
    res.json({ results: [] });
    return;
  }

  const user = req.authUser!;
  let scopeClause = '';
  const params: unknown[] = [];

  if (user.role === 'COURT' && user.courtProfile) {
    scopeClause = `AND cr.court_id = ?`;
    params.push(user.courtProfile.id);
  } else if (user.role === 'PATWARI' && user.patwariProfile) {
    scopeClause = `AND cr.patwari_id = ?`;
    params.push(user.patwariProfile.id);
  }

  const like = `%${q}%`;
  params.push(like, like, like, like, like, like, like, like);

  const results = db
    .prepare(
      `SELECT cr.request_id, cr.case_number, cr.status, cr.created_at, cr.updated_at,
              d.district_name, t.tehsil_name, v.village_name,
              c.court_name, p.patwari_name
       FROM case_requests cr
       JOIN districts d ON d.id = cr.district_id
       JOIN tehsils t ON t.id = cr.tehsil_id
       JOIN villages v ON v.id = cr.village_id
       JOIN courts c ON c.id = cr.court_id
       JOIN patwaris p ON p.id = cr.patwari_id
       WHERE 1=1 ${scopeClause}
         AND (
           LOWER(cr.request_id) LIKE ? OR
           LOWER(cr.case_number) LIKE ? OR
           LOWER(c.court_name) LIKE ? OR
           LOWER(p.patwari_name) LIKE ? OR
           LOWER(d.district_name) LIKE ? OR
           LOWER(t.tehsil_name) LIKE ? OR
           LOWER(v.village_name) LIKE ? OR
           LOWER(cr.status) LIKE ?
         )
       ORDER BY cr.updated_at DESC
       LIMIT 25`
    )
    .all(...params);

  res.json({ results });
});

// Secure RBAC-checked attachment download
sharedRoutes.get('/uploads/:filename', (req, res) => {
  const filename = path.basename(String(req.params.filename));
  const fullPath = path.join(UPLOAD_DIR, filename);

  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: 'Attachment file not found.' });
    return;
  }

  const user = req.authUser!;
  if (user.role !== 'ADMIN') {
    const matchingReport = db
      .prepare(
        `SELECT cr.court_id, cr.patwari_id
         FROM patwari_reports pr
         JOIN case_requests cr ON cr.id = pr.request_id
         WHERE pr.attachments_json LIKE ?
         LIMIT 1`
      )
      .get(`%${filename}%`) as { court_id: number; patwari_id: number } | undefined;

    if (!matchingReport) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    if (user.role === 'COURT' && matchingReport.court_id !== user.courtProfile?.id) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    if (user.role === 'PATWARI' && matchingReport.patwari_id !== user.patwariProfile?.id) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }
  }

  res.sendFile(fullPath);
});
