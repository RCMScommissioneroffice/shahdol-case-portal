import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'shahdol-division-court-patwari-secret-2026-dev';
export const SESSION_COOKIE = 'shahdol_session';

export type UserRole = 'COURT' | 'PATWARI' | 'ADMIN';

export interface AuthenticatedUser {
  id: number;
  userId: string;
  role: UserRole;
  name: string;
  phone: string;
  status: string;
  courtProfile?: {
    id: number;
    district_id: number;
    district_name: string;
    district_code: string;
    tehsil_id: number;
    tehsil_name: string;
    court_name: string;
    po_name: string;
    po_phone: string;
  };
  patwariProfile?: {
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
  };
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const key = decodeURIComponent(part.slice(0, idx).trim());
      const val = decodeURIComponent(part.slice(idx + 1).trim());
      cookies[key] = val;
    }
  }
  return cookies;
}

export function signSessionToken(userId: string, role: UserRole): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '12h' });
}

export function loadUserProfile(userId: string): AuthenticatedUser | null {
  const userRow = db
    .prepare(`SELECT id, user_id, role, name, phone, status FROM users WHERE user_id = ?`)
    .get(userId) as
    | { id: number; user_id: string; role: UserRole; name: string; phone: string; status: string }
    | undefined;

  if (!userRow || userRow.status !== 'ACTIVE') {
    return null;
  }

  const base: AuthenticatedUser = {
    id: userRow.id,
    userId: userRow.user_id,
    role: userRow.role,
    name: userRow.name,
    phone: userRow.phone,
    status: userRow.status
  };

  if (userRow.role === 'COURT') {
    const court = db
      .prepare(
        `SELECT c.id, c.district_id, d.district_name, d.code as district_code,
                c.tehsil_id, t.tehsil_name, c.court_name, c.po_name, c.po_phone
         FROM courts c
         JOIN districts d ON d.id = c.district_id
         JOIN tehsils t ON t.id = c.tehsil_id
         WHERE c.user_id = ?`
      )
      .get(userRow.user_id) as AuthenticatedUser['courtProfile'] | undefined;
    if (court) base.courtProfile = court;
  } else if (userRow.role === 'PATWARI') {
    const patwari = db
      .prepare(
        `SELECT p.id, p.district_id, d.district_name, d.code as district_code,
                p.tehsil_id, t.tehsil_name, p.village_id, v.village_name,
                p.patwari_name, p.patwari_phone
         FROM patwaris p
         JOIN districts d ON d.id = p.district_id
         JOIN tehsils t ON t.id = p.tehsil_id
         JOIN villages v ON v.id = p.village_id
         WHERE p.user_id = ?`
      )
      .get(userRow.user_id) as AuthenticatedUser['patwariProfile'] | undefined;
    if (patwari) base.patwariProfile = patwari;
  }

  return base;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const cookies = parseCookies(req.headers.cookie);
  const authHeader = req.headers.authorization;
  const queryToken = typeof req.query.token === 'string' ? req.query.token : null;
  const token =
    (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null) ||
    cookies[SESSION_COOKIE] ||
    queryToken;

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: UserRole };
    const profile = loadUserProfile(decoded.userId);
    if (!profile) {
      res.status(401).json({ error: 'Account is inactive or no longer exists.' });
      return;
    }
    req.authUser = profile;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!roles.includes(req.authUser.role)) {
      res.status(403).json({
        error: `Access denied. This action requires ${roles.join(' or ')} authorization.`
      });
      return;
    }
    next();
  };
}
