import { currentApiSession } from "@/lib/api-session";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

export async function GET(request: Request) {
  const session = await currentApiSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const tables: Record<string, unknown> = {};
  const queries: Array<[string, string]> = [
    ["profile", `SELECT id,email,display_name,preferred_language,role,privacy_notice_version,privacy_accepted_at,analytics_consent,pilot_participant,deletion_requested_at,created_at,updated_at FROM users WHERE id=$1`],
    ["consents", `SELECT consent_type,document_version,granted,source,created_at FROM user_consents WHERE user_id=$1 ORDER BY created_at`],
    ["favorites", `SELECT favorite_type,entity_id,created_at FROM favorites WHERE user_id=$1 ORDER BY created_at`],
    ["tickets", `SELECT public_code,ticket_type,line_id,origin_stop_id,destination_stop_id,stop_count,price,status,purchased_at,activated_at,expires_at FROM tickets WHERE user_id=$1 ORDER BY purchased_at`],
    ["notifications", `SELECT type,title_es,title_en,body_es,body_en,read_at,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at`],
    ["feedback", `SELECT category,entity_type,entity_id,rating,message,status,admin_response,created_at,updated_at,resolved_at FROM feedback_reports WHERE user_id=$1 ORDER BY created_at`],
    ["analytics", `SELECT event_name,section,properties,session_day,created_at FROM analytics_events WHERE user_id=$1 ORDER BY created_at`],
  ];
  for (const [name, sql] of queries) tables[name] = (await db.query(sql, [session.sub])).rows;
  await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "privacy.data_exported", entityType: "user", entityId: session.sub, ipAddress: requestIp(request) });
  const payload = JSON.stringify({ format: "smap-user-export-v1", exportedAt: new Date().toISOString(), data: tables }, null, 2);
  return new Response(payload, { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="smap-user-data-${new Date().toISOString().slice(0,10)}.json"`, "Cache-Control": "no-store" } });
}
