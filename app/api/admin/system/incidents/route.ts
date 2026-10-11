import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

export async function POST(request: Request) {
  const session = await currentAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !["info", "warning", "critical"].includes(String(body.severity))) return NextResponse.json({ error: "Invalid incident" }, { status: 400 });
  const values = ["titleEs", "titleEn", "bodyEs", "bodyEn"].map((key) => String(body[key] ?? "").trim());
  if (values.some((value) => !value)) return NextResponse.json({ error: "Incident texts are required" }, { status: 400 });
  const result = await db.query(`INSERT INTO service_incidents(severity,status,title_es,title_en,body_es,body_en,created_by) VALUES($1,'open',$2,$3,$4,$5,$6) RETURNING id`, [body.severity, values[0].slice(0, 180), values[1].slice(0, 180), values[2].slice(0, 1500), values[3].slice(0, 1500), session.sub]);
  await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "admin.incident_created", entityType: "service_incident", entityId: result.rows[0].id, ipAddress: requestIp(request), details: { severity: body.severity } });
  return NextResponse.json({ ok: true, id: result.rows[0].id });
}

export async function PATCH(request: Request) {
  const session = await currentAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as { id?: string; status?: string } | null;
  if (!body?.id || !["open", "monitoring", "resolved"].includes(String(body.status))) return NextResponse.json({ error: "Invalid incident update" }, { status: 400 });
  const result = await db.query(`UPDATE service_incidents SET status=$2,resolved_at=CASE WHEN $2='resolved' THEN NOW() ELSE NULL END,updated_at=NOW() WHERE id=$1 RETURNING id`, [body.id, body.status]);
  if (!result.rowCount) return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "admin.incident_updated", entityType: "service_incident", entityId: body.id, ipAddress: requestIp(request), details: { status: body.status } });
  return NextResponse.json({ ok: true });
}
