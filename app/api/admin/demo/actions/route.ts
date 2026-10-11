import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentAdminSession } from "@/lib/admin";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

export async function POST(request: Request) {
  const session = await currentAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as { action?: string } | null;
  const ipAddress = requestIp(request);

  if (body?.action === "reset") {
    await db.query("UPDATE demo_settings SET simulation_speed=1,paused=FALSE,updated_at=NOW() WHERE id=1");
    await db.query("UPDATE demo_bus_controls SET operational_status='in_service',speed_multiplier=1,occupancy_override=NULL,updated_at=NOW()");
    await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "admin.demo_reset", entityType: "simulation", ipAddress });
    return NextResponse.json({ ok: true });
  }

  if (body?.action === "service_notification") {
    const result = await db.query(`INSERT INTO notifications(user_id,type,title_es,title_en,body_es,body_en)
      SELECT id,'service_demo','Aviso de servicio','Service notice',
      'Aviso de demostración: revisa el estado de los autobuses en el mapa.',
      'Demo notice: check current bus status on the map.' FROM users WHERE service_notifications=TRUE`);
    await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "admin.service_notification", entityType: "notification", ipAddress, details: { recipients: result.rowCount } });
    return NextResponse.json({ ok: true });
  }

  if (body?.action === "expire_ticket") {
    const result = await db.query(`UPDATE tickets SET status='expired',expires_at=NOW()
      WHERE id=(SELECT id FROM tickets WHERE user_id=$1 AND status IN ('active','available') ORDER BY purchased_at DESC LIMIT 1)
      RETURNING id,public_code`, [session.sub]);
    if (!result.rowCount) return NextResponse.json({ error: "No ticket to expire" }, { status: 404 });
    await db.query(`INSERT INTO notifications(user_id,type,title_es,title_en,body_es,body_en)
      SELECT id,'ticket_expired','Billete caducado','Ticket expired',
             'El billete de demostración ha caducado.','The demo ticket has expired.'
        FROM users WHERE id=$1 AND ticket_notifications=TRUE`, [session.sub]);
    await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "admin.ticket_expired", entityType: "ticket", entityId: String(result.rows[0].id), ipAddress, details: { publicCode: result.rows[0].public_code } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
