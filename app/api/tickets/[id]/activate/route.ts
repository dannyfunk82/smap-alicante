import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentApiSession } from "@/lib/api-session";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";
import { trackAnalyticsEvent } from "@/lib/analytics";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const current = await db.query("SELECT ticket_type,status FROM tickets WHERE id=$1 AND user_id=$2", [id, session.sub]);
  if (!current.rowCount) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  if (current.rows[0].status !== "available") return NextResponse.json({ error: "Ticket cannot be activated" }, { status: 409 });
  const minutes = current.rows[0].ticket_type === "daily" ? 24 * 60 : 90;
  const updated = await db.query("UPDATE tickets SET status='active', activated_at=NOW(), expires_at=NOW()+($3 || ' minutes')::interval WHERE id=$1 AND user_id=$2 RETURNING public_code,expires_at", [id, session.sub, String(minutes)]);
  const publicCode = updated.rows[0].public_code;
  await db.query(`INSERT INTO notifications(user_id,type,title_es,title_en,body_es,body_en)
    SELECT id,'ticket_activation','Billete activado','Ticket activated',
           'El billete ${publicCode} ya está activo.','Ticket ${publicCode} is now active.'
      FROM users WHERE id=$1 AND ticket_notifications=TRUE`, [session.sub]);
  await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "ticket.activated", entityType: "ticket", entityId: id, ipAddress: requestIp(request), details: { publicCode, expiresAt: updated.rows[0].expires_at } });
  await trackAnalyticsEvent({ userId: session.sub, eventName: "ticket_activated", section: "tickets", properties: { ticketId: id } });
  return NextResponse.json({ ok: true, expiresAt: updated.rows[0].expires_at });
}
