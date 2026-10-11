import { db } from "@/lib/db";

export type AuditInput = {
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  ipAddress?: string | null;
  details?: Record<string, unknown>;
};

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_logs(actor_user_id, actor_email, action, entity_type, entity_id, ip_address, details)
       VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [input.actorUserId ?? null, input.actorEmail ?? null, input.action, input.entityType ?? null,
       input.entityId ?? null, input.ipAddress ?? null, JSON.stringify(input.details ?? {})],
    );
  } catch (error) {
    console.error("Audit log write failed", error);
  }
}
