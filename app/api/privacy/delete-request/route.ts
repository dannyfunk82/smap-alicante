import { NextResponse } from "next/server";
import { currentApiSession } from "@/lib/api-session";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

export async function POST(request: Request) {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { confirm?: string } | null;
  if (String(body?.confirm ?? "").toUpperCase() !== "DELETE") return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  await db.query("UPDATE users SET deletion_requested_at=NOW(),updated_at=NOW() WHERE id=$1", [session.sub]);
  await db.query(`INSERT INTO notifications(user_id,type,title_es,title_en,body_es,body_en)
    VALUES($1,'privacy_request','Solicitud registrada','Request recorded','Tu solicitud de eliminación se ha registrado para revisión.','Your deletion request has been recorded for review.')`, [session.sub]);
  await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "privacy.deletion_requested", entityType: "user", entityId: session.sub, ipAddress: requestIp(request) });
  return NextResponse.json({ ok: true, requestedAt: new Date().toISOString() });
}
