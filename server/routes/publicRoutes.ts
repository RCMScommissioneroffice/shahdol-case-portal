import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { db, generateUserId } from '../db';
import {
  loadUserProfile,
  requireAuth,
  SESSION_COOKIE,
  signSessionToken,
  type UserRole
} from '../middleware/auth';
import { logAudit } from '../services/notificationService';

export const publicRoutes = Router();

const MOBILE_REGEX = /^[6-9]\d{9}$/;

publicRoutes.get('/locations', (_req, res) => {
  const districts = db.prepare(`SELECT id, district_name, code FROM districts ORDER BY id ASC`).all();
  const tehsils = db
    .prepare(`SELECT id, district_id, tehsil_name FROM tehsils ORDER BY tehsil_name ASC`)
    .all();
  const villages = db
    .prepare(
      `SELECT v.id, v.district_id, v.tehsil_id, v.village_name,
              CASE WHEN p.id IS NOT NULL AND u.status = 'ACTIVE' THEN 1 ELSE 0 END AS has_patwari,
              p.patwari_name AS mapped_patwari_name
       FROM villages v
       LEFT JOIN patwaris p ON p.village_id = v.id
       LEFT JOIN users u ON u.user_id = p.user_id
       ORDER BY v.village_name ASC`
    )
    .all();

  res.json({ districts, tehsils, villages });
});

publicRoutes.post('/auth/register-court', (req, res) => {
  const { districtId, tehsilId, courtName, poName, poPhone, password, confirmPassword } = req.body || {};

  if (!districtId || !tehsilId || !courtName?.trim() || !poName?.trim() || !poPhone?.trim() || !password || !confirmPassword) {
    res.status(400).json({ error: 'All mandatory Court registration fields are required.' });
    return;
  }

  const cleanPhone = String(poPhone).trim().replace(/\s+/g, '');
  if (!MOBILE_REGEX.test(cleanPhone)) {
    res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number (starting with 6-9).' });
    return;
  }

  if (String(password).length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    return;
  }

  if (password !== confirmPassword) {
    res.status(400).json({ error: 'Password and Confirm Password do not match.' });
    return;
  }

  const district = db
    .prepare(`SELECT id, district_name, code FROM districts WHERE id = ?`)
    .get(Number(districtId)) as { id: number; district_name: string; code: string } | undefined;

  const tehsil = db
    .prepare(`SELECT id, tehsil_name FROM tehsils WHERE id = ? AND district_id = ?`)
    .get(Number(tehsilId), Number(districtId)) as { id: number; tehsil_name: string } | undefined;

  if (!district || !tehsil) {
    res.status(400).json({ error: 'Selected District and Tehsil combination is invalid.' });
    return;
  }

  const cleanCourtName = String(courtName).trim();
  const cleanPoName = String(poName).trim();

  const duplicateCourt = db
    .prepare(
      `SELECT id FROM courts
       WHERE district_id = ? AND tehsil_id = ? AND LOWER(TRIM(court_name)) = LOWER(?)`
    )
    .get(district.id, tehsil.id, cleanCourtName);

  if (duplicateCourt) {
    res.status(409).json({
      error: `Duplicate Court registration: "${cleanCourtName}" is already registered in ${tehsil.tehsil_name}, ${district.district_name}.`
    });
    return;
  }

  const duplicatePhone = db.prepare(`SELECT id FROM courts WHERE po_phone = ?`).get(cleanPhone);
  if (duplicatePhone) {
    res.status(409).json({
      error: 'This PO phone number is already registered with another Court account.'
    });
    return;
  }

  const userId = generateUserId('COURT', district.code);
  const passwordHash = bcrypt.hashSync(String(password), 10);

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO users (user_id, role, name, phone, password_hash, status)
       VALUES (?, 'COURT', ?, ?, ?, 'ACTIVE')`
    ).run(userId, cleanPoName, cleanPhone, passwordHash);

    db.prepare(
      `INSERT INTO courts (user_id, district_id, tehsil_id, court_name, po_name, po_phone)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(userId, district.id, tehsil.id, cleanCourtName, cleanPoName, cleanPhone);

    logAudit(userId, 'COURT', 'COURT_REGISTERED', 'COURT', userId, `${cleanCourtName} (${tehsil.tehsil_name}, ${district.district_name})`);
  });

  tx();

  res.status(201).json({
    message: 'Court registered successfully.',
    userId,
    courtName: cleanCourtName,
    poName: cleanPoName,
    districtName: district.district_name,
    tehsilName: tehsil.tehsil_name
  });
});

publicRoutes.post('/auth/register-patwari', (req, res) => {
  const { districtId, tehsilId, villageId, patwariName, patwariPhone, password, confirmPassword } = req.body || {};

  if (!districtId || !tehsilId || !villageId || !patwariName?.trim() || !patwariPhone?.trim() || !password || !confirmPassword) {
    res.status(400).json({ error: 'All mandatory Patwari registration fields are required.' });
    return;
  }

  const cleanPhone = String(patwariPhone).trim().replace(/\s+/g, '');
  if (!MOBILE_REGEX.test(cleanPhone)) {
    res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number (starting with 6-9).' });
    return;
  }

  if (String(password).length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    return;
  }

  if (password !== confirmPassword) {
    res.status(400).json({ error: 'Password and Confirm Password do not match.' });
    return;
  }

  const district = db
    .prepare(`SELECT id, district_name, code FROM districts WHERE id = ?`)
    .get(Number(districtId)) as { id: number; district_name: string; code: string } | undefined;

  const tehsil = db
    .prepare(`SELECT id, tehsil_name FROM tehsils WHERE id = ? AND district_id = ?`)
    .get(Number(tehsilId), Number(districtId)) as { id: number; tehsil_name: string } | undefined;

  const village = db
    .prepare(`SELECT id, village_name FROM villages WHERE id = ? AND tehsil_id = ? AND district_id = ?`)
    .get(Number(villageId), Number(tehsilId), Number(districtId)) as
    | { id: number; village_name: string }
    | undefined;

  if (!district || !tehsil || !village) {
    res.status(400).json({ error: 'Selected District, Tehsil, and Village hierarchy is invalid.' });
    return;
  }

  const existingVillagePatwari = db
    .prepare(`SELECT id, patwari_name FROM patwaris WHERE village_id = ?`)
    .get(village.id) as { id: number; patwari_name: string } | undefined;

  if (existingVillagePatwari) {
    res.status(409).json({
      error: `Duplicate Patwari registration: Village "${village.village_name}" is already assigned to Patwari ${existingVillagePatwari.patwari_name}.`
    });
    return;
  }

  const duplicatePhone = db.prepare(`SELECT id FROM patwaris WHERE patwari_phone = ?`).get(cleanPhone);
  if (duplicatePhone) {
    res.status(409).json({
      error: 'This mobile number is already registered with another Patwari account.'
    });
    return;
  }

  const cleanName = String(patwariName).trim();
  const userId = generateUserId('PATWARI', district.code);
  const passwordHash = bcrypt.hashSync(String(password), 10);

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO users (user_id, role, name, phone, password_hash, status)
       VALUES (?, 'PATWARI', ?, ?, ?, 'ACTIVE')`
    ).run(userId, cleanName, cleanPhone, passwordHash);

    db.prepare(
      `INSERT INTO patwaris (user_id, district_id, tehsil_id, village_id, patwari_name, patwari_phone)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(userId, district.id, tehsil.id, village.id, cleanName, cleanPhone);

    logAudit(userId, 'PATWARI', 'PATWARI_REGISTERED', 'PATWARI', userId, `${cleanName} -> ${village.village_name}, ${tehsil.tehsil_name}`);
  });

  tx();

  res.status(201).json({
    message: 'Patwari registered successfully.',
    userId,
    patwariName: cleanName,
    districtName: district.district_name,
    tehsilName: tehsil.tehsil_name,
    villageName: village.village_name
  });
});

publicRoutes.post('/auth/login', (req, res) => {
  const { loginType, userId, password } = req.body || {};

  if (!loginType || !userId?.trim() || !password) {
    res.status(400).json({ error: 'Login Type, User ID, and Password are required.' });
    return;
  }

  const requestedRole = String(loginType).toUpperCase() as UserRole;
  if (!['COURT', 'PATWARI', 'ADMIN'].includes(requestedRole)) {
    res.status(400).json({ error: 'Invalid login type selected.' });
    return;
  }

  const cleanUserId = String(userId).trim().toUpperCase();
  const userRow = db
    .prepare(`SELECT id, user_id, role, name, phone, password_hash, status FROM users WHERE UPPER(user_id) = ?`)
    .get(cleanUserId) as
    | { id: number; user_id: string; role: UserRole; name: string; phone: string; password_hash: string; status: string }
    | undefined;

  if (!userRow) {
    res.status(401).json({ error: 'Invalid User ID or Password.' });
    return;
  }

  if (userRow.role !== requestedRole) {
    res.status(403).json({
      error: `Role mismatch: This User ID belongs to ${userRow.role}. Please select the matching login portal.`
    });
    return;
  }

  if (userRow.status !== 'ACTIVE') {
    res.status(403).json({
      error: 'Your account has been deactivated by the System Administrator.'
    });
    return;
  }

  const passwordValid = bcrypt.compareSync(String(password), userRow.password_hash);
  if (!passwordValid) {
    logAudit(userRow.user_id, userRow.role, 'LOGIN_FAILED', 'USER', userRow.user_id, 'Invalid password attempt');
    res.status(401).json({ error: 'Invalid User ID or Password.' });
    return;
  }

  const token = signSessionToken(userRow.user_id, userRow.role);
  const profile = loadUserProfile(userRow.user_id);

  logAudit(userRow.user_id, userRow.role, 'LOGIN_SUCCESS', 'USER', userRow.user_id, `Logged in via ${requestedRole} portal`);

  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    path: '/',
    maxAge: 12 * 60 * 60 * 1000
  });

  res.json({ user: profile, token });
});

publicRoutes.post('/auth/logout', (req, res) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.clearCookie(SESSION_COOKIE, {
    path: '/',
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps
  });
  res.json({ message: 'Logged out successfully.' });
});

publicRoutes.get('/auth/me', requireAuth, (req, res) => {
  const unreadRow = db
    .prepare(`SELECT COUNT(*) AS unread FROM notifications WHERE recipient_user_id = ? AND is_read = 0`)
    .get(req.authUser!.userId) as { unread: number };

  res.json({
    user: req.authUser,
    unreadNotifications: unreadRow.unread
  });
});
