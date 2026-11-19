import { db } from '../db';

export interface NotificationPayload {
  recipientUserId: string;
  requestId?: string | null;
  title: string;
  message: string;
  phone?: string;
}

/**
 * Modular gateway interface ready for future SMS / Email / WhatsApp integration
 * without changing core case workflow logic.
 */
export interface NotificationAdapter {
  channel: 'IN_APP' | 'SMS' | 'EMAIL' | 'WHATSAPP';
  send(payload: NotificationPayload): Promise<void>;
}

const inAppAdapter: NotificationAdapter = {
  channel: 'IN_APP',
  async send(payload) {
    db.prepare(
      `INSERT INTO notifications (recipient_user_id, request_id, title, message, channel)
       VALUES (?, ?, ?, ?, 'IN_APP')`
    ).run(payload.recipientUserId, payload.requestId ?? null, payload.title, payload.message);
  }
};

// Future plug-in adapters (SMS / Email / WhatsApp) can be registered here via env vars.
const activeAdapters: NotificationAdapter[] = [inAppAdapter];

export async function dispatchNotification(payload: NotificationPayload): Promise<void> {
  for (const adapter of activeAdapters) {
    await adapter.send(payload);
  }
}

export function logAudit(
  actorUserId: string,
  actorRole: string,
  action: string,
  entityType: string,
  entityId: string,
  details = ''
) {
  db.prepare(
    `INSERT INTO audit_logs (actor_user_id, actor_role, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(actorUserId, actorRole, action, entityType, entityId, details);
}
