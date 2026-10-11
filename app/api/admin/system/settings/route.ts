import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

export async function PATCH(request: Request) {
  const session = await currentAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const supportEmail = String(body.supportEmail ?? "").trim();
  if (supportEmail && !/^\S+@\S+\.\S+$/.test(supportEmail)) return NextResponse.json({ error: "Invalid support email" }, { status: 400 });
  const fields = {
    maintenanceMode: Boolean(body.maintenanceMode),
    maintenanceTitleEs: String(body.maintenanceTitleEs ?? "").slice(0, 160),
    maintenanceTitleEn: String(body.maintenanceTitleEn ?? "").slice(0, 160),
    maintenanceMessageEs: String(body.maintenanceMessageEs ?? "").slice(0, 1000),
    maintenanceMessageEn: String(body.maintenanceMessageEn ?? "").slice(0, 1000),
    publicStatusMessageEs: String(body.publicStatusMessageEs ?? "").slice(0, 500),
    publicStatusMessageEn: String(body.publicStatusMessageEn ?? "").slice(0, 500),
    supportEmail,
  };
  await db.query(`INSERT INTO runtime_settings(id,maintenance_mode,maintenance_title_es,maintenance_title_en,maintenance_message_es,maintenance_message_en,support_email,public_status_message_es,public_status_message_en,updated_by,updated_at)
    VALUES(1,$1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
    ON CONFLICT(id) DO UPDATE SET maintenance_mode=EXCLUDED.maintenance_mode,maintenance_title_es=EXCLUDED.maintenance_title_es,
      maintenance_title_en=EXCLUDED.maintenance_title_en,maintenance_message_es=EXCLUDED.maintenance_message_es,
      maintenance_message_en=EXCLUDED.maintenance_message_en,support_email=EXCLUDED.support_email,
      public_status_message_es=EXCLUDED.public_status_message_es,public_status_message_en=EXCLUDED.public_status_message_en,
      updated_by=EXCLUDED.updated_by,updated_at=NOW()`, [fields.maintenanceMode, fields.maintenanceTitleEs, fields.maintenanceTitleEn, fields.maintenanceMessageEs, fields.maintenanceMessageEn, fields.supportEmail || null, fields.publicStatusMessageEs || null, fields.publicStatusMessageEn || null, session.sub]);
  await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "admin.runtime_settings_changed", entityType: "runtime_settings", entityId: "1", ipAddress: requestIp(request), details: { maintenanceMode: fields.maintenanceMode } });
  return NextResponse.json({ ok: true });
}
