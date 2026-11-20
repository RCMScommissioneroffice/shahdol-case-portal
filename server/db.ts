import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'shahdol.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK(role IN ('COURT', 'PATWARI', 'ADMIN')),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS districts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      district_name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS tehsils (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
      tehsil_name TEXT NOT NULL,
      UNIQUE(district_id, tehsil_name)
    );

    CREATE TABLE IF NOT EXISTS villages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
      tehsil_id INTEGER NOT NULL REFERENCES tehsils(id) ON DELETE CASCADE,
      village_name TEXT NOT NULL,
      UNIQUE(tehsil_id, village_name)
    );

    CREATE TABLE IF NOT EXISTS courts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
      district_id INTEGER NOT NULL REFERENCES districts(id),
      tehsil_id INTEGER NOT NULL REFERENCES tehsils(id),
      court_name TEXT NOT NULL,
      po_name TEXT NOT NULL,
      po_phone TEXT NOT NULL,
      UNIQUE(district_id, tehsil_id, court_name)
    );

    CREATE TABLE IF NOT EXISTS patwaris (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
      district_id INTEGER NOT NULL REFERENCES districts(id),
      tehsil_id INTEGER NOT NULL REFERENCES tehsils(id),
      village_id INTEGER NOT NULL UNIQUE REFERENCES villages(id),
      patwari_name TEXT NOT NULL,
      patwari_phone TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS case_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL UNIQUE,
      court_id INTEGER NOT NULL REFERENCES courts(id),
      district_id INTEGER NOT NULL REFERENCES districts(id),
      tehsil_id INTEGER NOT NULL REFERENCES tehsils(id),
      village_id INTEGER NOT NULL REFERENCES villages(id),
      patwari_id INTEGER NOT NULL REFERENCES patwaris(id),
      case_number TEXT NOT NULL,
      case_details TEXT NOT NULL,
      additional_instructions TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN (
        'Pending',
        'Viewed by Patwari',
        'Report in Progress',
        'Report Submitted',
        'Returned for Correction',
        'Report Resubmitted',
        'Closed'
      )),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS patwari_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL REFERENCES case_requests(id) ON DELETE CASCADE,
      patwari_id INTEGER NOT NULL REFERENCES patwaris(id),
      version INTEGER NOT NULL DEFAULT 1,
      report_date TEXT NOT NULL,
      findings TEXT NOT NULL,
      remarks TEXT NOT NULL,
      land_details TEXT DEFAULT '',
      applicant_details TEXT DEFAULT '',
      site_verification_details TEXT DEFAULT '',
      revenue_record_details TEXT DEFAULT '',
      other_info TEXT DEFAULT '',
      attachments_json TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'Submitted' CHECK(status IN (
        'Submitted',
        'Resubmitted',
        'Returned for Correction',
        'Accepted'
      )),
      correction_reason TEXT DEFAULT '',
      submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS report_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL REFERENCES case_requests(id) ON DELETE CASCADE,
      report_id INTEGER REFERENCES patwari_reports(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      performed_by_user_id TEXT NOT NULL,
      performed_by_name TEXT NOT NULL,
      performed_by_role TEXT NOT NULL,
      comments TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      request_id TEXT DEFAULT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'IN_APP',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_case_requests_court ON case_requests(court_id);
    CREATE INDEX IF NOT EXISTS idx_case_requests_patwari ON case_requests(patwari_id);
    CREATE INDEX IF NOT EXISTS idx_case_requests_status ON case_requests(status);
    CREATE INDEX IF NOT EXISTS idx_case_requests_district ON case_requests(district_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_report_history_request ON report_history(request_id);
  `);
}

export function seedDemoData() {
  const existingDistricts = db.prepare('SELECT COUNT(*) as count FROM districts').get() as { count: number };
  if (existingDistricts.count > 0) {
    return;
  }

  const seedTx = db.transaction(() => {
    const insertDistrict = db.prepare('INSERT INTO districts (district_name, code) VALUES (?, ?)');
    const insertTehsil = db.prepare('INSERT INTO tehsils (district_id, tehsil_name) VALUES (?, ?)');

    const divisions: Record<string, { code: string; tehsils: string[] }> = {
      Shahdol: {
        code: 'SHD',
        tehsils: ['Sohagpur', 'Beohari', 'Jaisinghnagar', 'Jaitpur', 'Burhar', 'Gohparu']
      },
      Umaria: {
        code: 'UMR',
        tehsils: ['Bandhavgarh', 'Pali', 'Manpur', 'Chandia', 'Nowrozabad']
      },
      Anuppur: {
        code: 'ANP',
        tehsils: ['Anuppur', 'Kotma', 'Pushprajgarh', 'Jaithari']
      }
    };

    for (const [dName, dData] of Object.entries(divisions)) {
      const dRes = insertDistrict.run(dName, dData.code);
      const dId = Number(dRes.lastInsertRowid);

      for (const tName of dData.tehsils) {
        insertTehsil.run(dId, tName);
      }
    }

    const adminHash = bcrypt.hashSync('Admin@123', 10);
    db.prepare(
      `INSERT INTO users (user_id, role, name, phone, password_hash, status) VALUES (?, 'ADMIN', ?, ?, ?, 'ACTIVE')`
    ).run('ADMIN-SHD-001', 'Divisional Commissioner Office Admin', '9425180001', adminHash);
  });

  seedTx();
}

export function deactivateLegacyDemoUsers() {
  const legacyUsers: Array<[string, string]> = [
    ['COURT-SHD-001', 'Shri R.K. Tiwari'],
    ['COURT-SHD-002', 'Smt. Anjali Verma'],
    ['COURT-UMR-001', 'Shri V.S. Baghel'],
    ['COURT-ANP-001', 'Shri P.K. Dubey'],
    ['PATWARI-SHD-001', 'Mahesh Prasad Tiwari'],
    ['PATWARI-SHD-002', 'Sunita Singh'],
    ['PATWARI-SHD-003', 'Rajesh Kumar Patel'],
    ['PATWARI-UMR-001', 'Dinesh Kumar Yadav'],
    ['PATWARI-ANP-001', 'Kamleshwar Sahu']
  ];

  const stmt = db.prepare(`UPDATE users SET status = 'INACTIVE' WHERE user_id = ? AND name = ? AND status = 'ACTIVE'`);
  const tx = db.transaction(() => {
    for (const [uid, name] of legacyUsers) {
      stmt.run(uid, name);
    }
  });
  tx();
}

export function generateUserId(role: 'COURT' | 'PATWARI', districtCode: string): string {
  const prefix = `${role}-${districtCode}-`;
  const row = db
    .prepare(`SELECT user_id FROM users WHERE user_id LIKE ? ORDER BY user_id DESC LIMIT 1`)
    .get(`${prefix}%`) as { user_id: string } | undefined;

  let nextNum = 1;
  if (row) {
    const parts = row.user_id.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

export function generateRequestId(districtCode: string): string {
  const year = new Date().getFullYear();
  const prefix = `REQ-${districtCode}-${year}-`;
  const row = db
    .prepare(`SELECT request_id FROM case_requests WHERE request_id LIKE ? ORDER BY request_id DESC LIMIT 1`)
    .get(`${prefix}%`) as { request_id: string } | undefined;

  let nextNum = 1;
  if (row) {
    const parts = row.request_id.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }
  return `${prefix}${String(nextNum).padStart(5, '0')}`;
}
