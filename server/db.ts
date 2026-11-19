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
    const insertVillage = db.prepare('INSERT INTO villages (district_id, tehsil_id, village_name) VALUES (?, ?, ?)');

    const divisions: Record<string, { code: string; tehsils: Record<string, string[]> }> = {
      Shahdol: {
        code: 'SHD',
        tehsils: {
          Sohagpur: ['Kalyanpur', 'Jamui', 'Kudri', 'Singhpur', 'Chhatwai', 'Dhurwar', 'Pachgaon'],
          Beohari: ['Nipaniya', 'Vijaysota', 'Khadda', 'Bansukli', 'Sarsi', 'Mau'],
          Jaisinghnagar: ['Karkati', 'Amjhor', 'Kanchanpur', 'Bansagar', 'Chauri'],
          Jaitpur: ['Jaitpur Khas', 'Rasmohani', 'Keshwahi', 'Bhamraha', 'Pondi'],
          Burhar: ['Burhar Khas', 'Dhanpuri', 'Amlai', 'Bakho', 'Keshauri'],
          Gohparu: ['Gohparu Khas', 'Khannaudhi', 'Khamha', 'Barkoda', 'Paliyar']
        }
      },
      Umaria: {
        code: 'UMR',
        tehsils: {
          Bandhavgarh: ['Tala', 'Bharhut', 'Dhamokhar', 'Kachharwar', 'Lorha'],
          Pali: ['Birsinghpur Pali', 'Ghoghari', 'Maliyaguda', 'Chauri', 'Goraiya'],
          Manpur: ['Manpur Khas', 'Chilhari', 'Indwar', 'Semra', 'Parasi'],
          Chandia: ['Chandia Khas', 'Kaudia', 'Bharola', 'Akhdar', 'Majhgawan'],
          Nowrozabad: ['Nowrozabad Khas', 'Karkeli', 'Pinora', 'Mahroi', 'Barbaspur']
        }
      },
      Anuppur: {
        code: 'ANP',
        tehsils: {
          Anuppur: ['Chhulha', 'Kirgi', 'Mediyaras', 'Sakola', 'Payari'],
          Kotma: ['Kotma Khas', 'Bijuri', 'Bhalumada', 'Nigwani', 'Lohsara'],
          Pushprajgarh: ['Rajendragram', 'Amarkantak', 'Karpa', 'Bhejri', 'Lakhaundi'],
          Jaithari: ['Jaithari Khas', 'Venkatnagar', 'Lapta', 'Chilhari', 'Dhangawan']
        }
      }
    };

    const districtMap: Record<string, number> = {};
    const tehsilMap: Record<string, number> = {};
    const villageMap: Record<string, number> = {};

    for (const [dName, dData] of Object.entries(divisions)) {
      const dRes = insertDistrict.run(dName, dData.code);
      const dId = Number(dRes.lastInsertRowid);
      districtMap[dName] = dId;

      for (const [tName, villages] of Object.entries(dData.tehsils)) {
        const tRes = insertTehsil.run(dId, tName);
        const tId = Number(tRes.lastInsertRowid);
        tehsilMap[`${dName}:${tName}`] = tId;

        for (const vName of villages) {
          const vRes = insertVillage.run(dId, tId, vName);
          villageMap[`${dName}:${tName}:${vName}`] = Number(vRes.lastInsertRowid);
        }
      }
    }

    const insertUser = db.prepare(
      `INSERT INTO users (user_id, role, name, phone, password_hash, status) VALUES (?, ?, ?, ?, ?, 'ACTIVE')`
    );
    const insertCourt = db.prepare(
      `INSERT INTO courts (user_id, district_id, tehsil_id, court_name, po_name, po_phone) VALUES (?, ?, ?, ?, ?, ?)`
    );
    const insertPatwari = db.prepare(
      `INSERT INTO patwaris (user_id, district_id, tehsil_id, village_id, patwari_name, patwari_phone) VALUES (?, ?, ?, ?, ?, ?)`
    );

    const adminHash = bcrypt.hashSync('Admin@123', 10);
    const courtHash = bcrypt.hashSync('Court@123', 10);
    const patwariHash = bcrypt.hashSync('Patwari@123', 10);

    // 1. System Administrator
    insertUser.run('ADMIN-SHD-001', 'ADMIN', 'Divisional Commissioner Office Admin', '9425180001', adminHash);

    // 2. Demo Courts
    const demoCourts = [
      {
        userId: 'COURT-SHD-001',
        district: 'Shahdol',
        tehsil: 'Sohagpur',
        courtName: 'SDM Revenue Court, Sohagpur',
        poName: 'Shri R.K. Tiwari',
        phone: '9425181101'
      },
      {
        userId: 'COURT-SHD-002',
        district: 'Shahdol',
        tehsil: 'Beohari',
        courtName: 'Tehsildar Revenue Court, Beohari',
        poName: 'Smt. Anjali Verma',
        phone: '9425181102'
      },
      {
        userId: 'COURT-UMR-001',
        district: 'Umaria',
        tehsil: 'Bandhavgarh',
        courtName: 'SDM Revenue Court, Bandhavgarh',
        poName: 'Shri V.S. Baghel',
        phone: '9425181103'
      },
      {
        userId: 'COURT-ANP-001',
        district: 'Anuppur',
        tehsil: 'Anuppur',
        courtName: 'Tehsildar Revenue Court, Anuppur',
        poName: 'Shri P.K. Dubey',
        phone: '9425181104'
      }
    ];

    const courtIdMap: Record<string, number> = {};
    for (const c of demoCourts) {
      insertUser.run(c.userId, 'COURT', c.poName, c.phone, courtHash);
      const res = insertCourt.run(
        c.userId,
        districtMap[c.district],
        tehsilMap[`${c.district}:${c.tehsil}`],
        c.courtName,
        c.poName,
        c.phone
      );
      courtIdMap[c.userId] = Number(res.lastInsertRowid);
    }

    // 3. Demo Patwaris (leaving several villages open for live registration tests!)
    const demoPatwaris = [
      {
        userId: 'PATWARI-SHD-001',
        district: 'Shahdol',
        tehsil: 'Sohagpur',
        village: 'Kalyanpur',
        name: 'Mahesh Prasad Tiwari',
        phone: '9826191001'
      },
      {
        userId: 'PATWARI-SHD-002',
        district: 'Shahdol',
        tehsil: 'Sohagpur',
        village: 'Jamui',
        name: 'Sunita Singh',
        phone: '9826191002'
      },
      {
        userId: 'PATWARI-SHD-003',
        district: 'Shahdol',
        tehsil: 'Beohari',
        village: 'Nipaniya',
        name: 'Rajesh Kumar Patel',
        phone: '9826191003'
      },
      {
        userId: 'PATWARI-UMR-001',
        district: 'Umaria',
        tehsil: 'Bandhavgarh',
        village: 'Tala',
        name: 'Dinesh Kumar Yadav',
        phone: '9826191004'
      },
      {
        userId: 'PATWARI-ANP-001',
        district: 'Anuppur',
        tehsil: 'Anuppur',
        village: 'Chhulha',
        name: 'Kamleshwar Sahu',
        phone: '9826191005'
      }
    ];

    const patwariIdMap: Record<string, number> = {};
    for (const p of demoPatwaris) {
      insertUser.run(p.userId, 'PATWARI', p.name, p.phone, patwariHash);
      const res = insertPatwari.run(
        p.userId,
        districtMap[p.district],
        tehsilMap[`${p.district}:${p.tehsil}`],
        villageMap[`${p.district}:${p.tehsil}:${p.village}`],
        p.name,
        p.phone
      );
      patwariIdMap[p.userId] = Number(res.lastInsertRowid);
    }

    // 4. Demo Case Requests & Reports for realistic initial dashboards & charts
    const insertReq = db.prepare(`
      INSERT INTO case_requests (
        request_id, court_id, district_id, tehsil_id, village_id, patwari_id,
        case_number, case_details, additional_instructions, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertReport = db.prepare(`
      INSERT INTO patwari_reports (
        request_id, patwari_id, version, report_date, findings, remarks,
        land_details, applicant_details, site_verification_details, revenue_record_details,
        other_info, attachments_json, status, correction_reason, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?)
    `);

    const insertHist = db.prepare(`
      INSERT INTO report_history (
        request_id, report_id, action, performed_by_user_id, performed_by_name, performed_by_role, comments, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertNotif = db.prepare(`
      INSERT INTO notifications (recipient_user_id, request_id, title, message, channel, is_read, created_at)
      VALUES (?, ?, ?, ?, 'IN_APP', 0, ?)
    `);

    // Case 1: Closed (Accepted)
    const r1 = insertReq.run(
      'REQ-SHD-2026-00001',
      courtIdMap['COURT-SHD-001'],
      districtMap['Shahdol'],
      tehsilMap['Shahdol:Sohagpur'],
      villageMap['Shahdol:Sohagpur:Kalyanpur'],
      patwariIdMap['PATWARI-SHD-001'],
      'CS/142/2026',
      'Khasra No. 214/2 (Area 1.45 Hectare) boundary demarcation & physical possession verification in Mauja Kalyanpur.',
      'Submit certified Khasra Panchsala copy & site panchnama within 7 days.',
      'Closed',
      '2026-10-12 10:15:00',
      '2026-10-16 15:30:00'
    );
    const req1Id = Number(r1.lastInsertRowid);
    const rep1 = insertReport.run(
      req1Id,
      patwariIdMap['PATWARI-SHD-001'],
      1,
      '2026-10-15',
      'Spot inspection completed in presence of village kotwar and adjoining landowners. Boundary pillars intact on North and East.',
      'Land Khasra No. 214/2 is recorded in name of applicant Ram Prasad Sahu as Bhumiswami. No encroachment observed on eastern medh.',
      'Khasra 214/2, Area 1.450 Hectare, Patwari Halka No. 14',
      'Ram Prasad Sahu S/o Bihari Sahu, R/o Kalyanpur',
      'Site verified on 15-10-2026 at 11:30 AM with Panchnama signatures.',
      'B-1 Khatauni 2025-26 & Khasra Naksha verified.',
      'Panchnama attached with field register entry #48.',
      'Accepted',
      '',
      '2026-10-15 16:40:00'
    );
    const rep1Id = Number(rep1.lastInsertRowid);
    insertHist.run(req1Id, null, 'Request Created & Assigned', 'COURT-SHD-001', 'Shri R.K. Tiwari', 'COURT', 'Sent to Patwari Mahesh Prasad Tiwari (Kalyanpur)', '2026-10-12 10:15:00');
    insertHist.run(req1Id, null, 'Viewed by Patwari', 'PATWARI-SHD-001', 'Mahesh Prasad Tiwari', 'PATWARI', 'Case opened for field inspection.', '2026-10-13 09:20:00');
    insertHist.run(req1Id, rep1Id, 'Report Submitted (v1)', 'PATWARI-SHD-001', 'Mahesh Prasad Tiwari', 'PATWARI', 'Field verification report submitted to court.', '2026-10-15 16:40:00');
    insertHist.run(req1Id, rep1Id, 'Report Accepted & Case Closed', 'COURT-SHD-001', 'Shri R.K. Tiwari', 'COURT', 'Report verified and taken on judicial record.', '2026-10-16 15:30:00');

    // Case 2: Report Submitted (awaiting Court review)
    const r2 = insertReq.run(
      'REQ-SHD-2026-00002',
      courtIdMap['COURT-SHD-001'],
      districtMap['Shahdol'],
      tehsilMap['Shahdol:Sohagpur'],
      villageMap['Shahdol:Sohagpur:Jamui'],
      patwariIdMap['PATWARI-SHD-002'],
      'REV/88/2026',
      'Partition (Batwara) verification report for joint holding Khasra Nos. 89/1, 89/2, and 91 in Village Jamui.',
      'Confirm mutual possession shares and access path (rasta).',
      'Report Submitted',
      '2026-11-04 11:00:00',
      '2026-11-08 14:20:00'
    );
    const req2Id = Number(r2.lastInsertRowid);
    const rep2 = insertReport.run(
      req2Id,
      patwariIdMap['PATWARI-SHD-002'],
      1,
      '2026-11-08',
      'All co-sharers present during measurement. Proposed Fard Batwara prepared with 3m agricultural approach road.',
      'Joint Khata No. 42 divided equally into 3 shares of 0.80 Hectare each as per possession.',
      'Khasra 89/1, 89/2, 91 — Total 2.40 Hectare',
      'Suresh Singh & 2 others, R/o Jamui',
      'Measured via chain & compass on 07-11-2026.',
      'Fard Batwara map prepared in revenue record.',
      '',
      'Submitted',
      '',
      '2026-11-08 14:20:00'
    );
    const rep2Id = Number(rep2.lastInsertRowid);
    insertHist.run(req2Id, null, 'Request Created & Assigned', 'COURT-SHD-001', 'Shri R.K. Tiwari', 'COURT', 'Assigned to Patwari Sunita Singh (Jamui)', '2026-11-04 11:00:00');
    insertHist.run(req2Id, rep2Id, 'Report Submitted (v1)', 'PATWARI-SHD-002', 'Sunita Singh', 'PATWARI', 'Batwara report submitted for court perusal.', '2026-11-08 14:20:00');
    insertNotif.run('COURT-SHD-001', 'REQ-SHD-2026-00002', 'Patwari Report Submitted', 'Patwari has submitted the report for Request ID REQ-SHD-2026-00002.', '2026-11-08 14:20:00');

    // Case 3: Returned for Correction
    const r3 = insertReq.run(
      'REQ-SHD-2026-00003',
      courtIdMap['COURT-SHD-002'],
      districtMap['Shahdol'],
      tehsilMap['Shahdol:Beohari'],
      villageMap['Shahdol:Beohari:Nipaniya'],
      patwariIdMap['PATWARI-SHD-003'],
      'MISC/21/2026',
      'Encroachment complaint verification on Government Nistar land Khasra No. 410 in Village Nipaniya.',
      'Provide exact encroached area in square meters and structure details.',
      'Returned for Correction',
      '2026-11-01 09:45:00',
      '2026-11-10 12:10:00'
    );
    const req3Id = Number(r3.lastInsertRowid);
    const rep3 = insertReport.run(
      req3Id,
      patwariIdMap['PATWARI-SHD-003'],
      1,
      '2026-11-06',
      'Partial fencing observed near northern boundary of Khasra No. 410.',
      'Temporary boundary wall noted; exact measurement pending.',
      'Khasra 410 (Govt. Nistar Land)',
      'State vs. Ramesh Gupta',
      'Preliminary site visit done.',
      'Nistar Patrak verified.',
      '',
      'Returned for Correction',
      'Please specify exact encroached dimensions in square meters, attach sketch map measurements, and name all witnesses in Panchnama.',
      '2026-11-06 17:15:00'
    );
    const rep3Id = Number(rep3.lastInsertRowid);
    insertHist.run(req3Id, null, 'Request Created & Assigned', 'COURT-SHD-002', 'Smt. Anjali Verma', 'COURT', 'Assigned to Patwari Rajesh Kumar Patel (Nipaniya)', '2026-11-01 09:45:00');
    insertHist.run(req3Id, rep3Id, 'Report Submitted (v1)', 'PATWARI-SHD-003', 'Rajesh Kumar Patel', 'PATWARI', 'Preliminary encroachment report submitted.', '2026-11-06 17:15:00');
    insertHist.run(req3Id, rep3Id, 'Returned for Correction', 'COURT-SHD-002', 'Smt. Anjali Verma', 'COURT', 'Please specify exact encroached dimensions in square meters, attach sketch map measurements, and name all witnesses in Panchnama.', '2026-11-10 12:10:00');
    insertNotif.run('PATWARI-SHD-003', 'REQ-SHD-2026-00003', 'Report Correction Requested', 'Court returned Request ID REQ-SHD-2026-00003 for correction.', '2026-11-10 12:10:00');

    // Case 4: Pending (Umaria)
    const r4 = insertReq.run(
      'REQ-UMR-2026-00001',
      courtIdMap['COURT-UMR-001'],
      districtMap['Umaria'],
      tehsilMap['Umaria:Bandhavgarh'],
      villageMap['Umaria:Bandhavgarh:Tala'],
      patwariIdMap['PATWARI-UMR-001'],
      'MJC/55/2026',
      'Mutation (Namantaran) objection inquiry regarding Will deed for Khasra No. 112/1 in Village Tala.',
      'Verify legal heirs and physical cultivation status.',
      'Pending',
      '2026-11-14 10:30:00',
      '2026-11-14 10:30:00'
    );
    const req4Id = Number(r4.lastInsertRowid);
    insertHist.run(req4Id, null, 'Request Created & Assigned', 'COURT-UMR-001', 'Shri V.S. Baghel', 'COURT', 'Assigned to Patwari Dinesh Kumar Yadav (Tala)', '2026-11-14 10:30:00');
    insertNotif.run('PATWARI-UMR-001', 'REQ-UMR-2026-00001', 'New Report Request Received', 'New report request received for Case MJC/55/2026 (REQ-UMR-2026-00001).', '2026-11-14 10:30:00');

    // Case 5: Report in Progress (Anuppur)
    const r5 = insertReq.run(
      'REQ-ANP-2026-00001',
      courtIdMap['COURT-ANP-001'],
      districtMap['Anuppur'],
      tehsilMap['Anuppur:Anuppur'],
      villageMap['Anuppur:Anuppur:Chhulha'],
      patwariIdMap['PATWARI-ANP-001'],
      'CS/309/2026',
      'Right of way (Rasta) dispute verification between Khasra 55 and 56 in Village Chhulha.',
      'Check old village map (1958-59 settlement) for traditional path.',
      'Report in Progress',
      '2026-11-12 13:05:00',
      '2026-11-15 11:00:00'
    );
    const req5Id = Number(r5.lastInsertRowid);
    insertHist.run(req5Id, null, 'Request Created & Assigned', 'COURT-ANP-001', 'Shri P.K. Dubey', 'COURT', 'Assigned to Patwari Kamleshwar Sahu (Chhulha)', '2026-11-12 13:05:00');
    insertHist.run(req5Id, null, 'Viewed by Patwari', 'PATWARI-ANP-001', 'Kamleshwar Sahu', 'PATWARI', 'Case opened by Patwari.', '2026-11-13 10:15:00');
    insertHist.run(req5Id, null, 'Status Updated: Report in Progress', 'PATWARI-ANP-001', 'Kamleshwar Sahu', 'PATWARI', 'Settlement record retrieval & field survey underway.', '2026-11-15 11:00:00');
  });

  seedTx();
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
