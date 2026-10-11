import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

function csv(value: unknown): string {
  const text = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const session = await currentAdminSession();
  if (!session) return new Response("Forbidden", { status: 403 });
  const result = await db.query(
    `SELECT id, actor_email, action, entity_type, entity_id, ip_address, details, created_at
       FROM audit_logs ORDER BY created_at DESC LIMIT 5000`,
  );
  const rows = ["id,actor_email,action,entity_type,entity_id,ip_address,details,created_at"];
  for (const row of result.rows) {
    rows.push([row.id, row.actor_email, row.action, row.entity_type, row.entity_id, row.ip_address, row.details, new Date(row.created_at).toISOString()].map(csv).join(","));
  }
  await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "admin.audit_exported", entityType: "audit_log", ipAddress: requestIp(request), details: { rows: result.rowCount } });
  return new Response(`\uFEFF${rows.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="smap-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
