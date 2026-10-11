import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentAdminSession } from "@/lib/admin";

export const dynamic = "force-dynamic";

type AuditRow = {
  id: number | string;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  details: Record<string, unknown> | string | null;
  created_at: Date | string;
};

export async function GET(request: Request) {
  const session = await currentAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(10, Number(url.searchParams.get("limit") ?? 40)));
  const [users, activeUsers, failed, locked, tickets, audits, logs] = await Promise.all([
    db.query("SELECT COUNT(*)::int AS count FROM users"),
    db.query("SELECT COUNT(*)::int AS count FROM users WHERE last_login_at > NOW()-INTERVAL '24 hours'"),
    db.query("SELECT COUNT(*)::int AS count FROM auth_attempts WHERE event_type='login' AND success=FALSE AND created_at > NOW()-INTERVAL '24 hours'"),
    db.query("SELECT COUNT(*)::int AS count FROM users WHERE locked_until > NOW()"),
    db.query("SELECT COUNT(*)::int AS count FROM tickets WHERE purchased_at > NOW()-INTERVAL '24 hours'"),
    db.query("SELECT COUNT(*)::int AS count FROM audit_logs WHERE created_at > NOW()-INTERVAL '24 hours'"),
    db.query(`SELECT id, actor_email, action, entity_type, entity_id, ip_address, details, created_at
                FROM audit_logs ORDER BY created_at DESC LIMIT $1`, [limit]),
  ]);
  return NextResponse.json({
    metrics: {
      users: Number(users.rows[0]?.count ?? 0),
      activeUsers24h: Number(activeUsers.rows[0]?.count ?? 0),
      failedLogins24h: Number(failed.rows[0]?.count ?? 0),
      lockedAccounts: Number(locked.rows[0]?.count ?? 0),
      tickets24h: Number(tickets.rows[0]?.count ?? 0),
      auditEvents24h: Number(audits.rows[0]?.count ?? 0),
    },
    auditLogs: logs.rows.map((row: AuditRow) => ({
      id: Number(row.id),
      actorEmail: row.actor_email,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      ipAddress: row.ip_address,
      details: typeof row.details === "string" ? JSON.parse(row.details) : (row.details ?? {}),
      createdAt: new Date(row.created_at).toISOString(),
    })),
  });
}
