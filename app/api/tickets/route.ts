import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentApiSession } from "@/lib/api-session";
import { fareForStops } from "@/lib/domain.js";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";
import { trackAnalyticsEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

function mapTicket(row: Record<string, unknown>) {
  const status = row.status === "active" && row.expires_at && new Date(String(row.expires_at)).getTime() < Date.now() ? "expired" : row.status;
  return { id: row.id, publicCode: row.public_code, ticketType: row.ticket_type, lineId: row.line_id, lineCode: row.line_code, originStopId: row.origin_stop_id, originName: row.origin_name, destinationStopId: row.destination_stop_id, destinationName: row.destination_name, stopCount: row.stop_count, price: Number(row.price), status, purchasedAt: row.purchased_at, activatedAt: row.activated_at, expiresAt: row.expires_at, paymentReference: row.payment_reference ?? null };
}

export async function GET(request: Request) {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const locale = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "es";
  await db.query("UPDATE tickets SET status = 'expired' WHERE user_id = $1 AND status = 'active' AND expires_at < NOW()", [session.sub]);
  const name = locale === "en" ? "name_en" : "name_es";
  const result = await db.query(`SELECT t.*, l.code AS line_code, o.${name} AS origin_name, d.${name} AS destination_name
    FROM tickets t JOIN lines l ON l.id=t.line_id JOIN stops o ON o.id=t.origin_stop_id JOIN stops d ON d.id=t.destination_stop_id
    WHERE t.user_id=$1 ORDER BY t.purchased_at DESC`, [session.sub]);
  return NextResponse.json({ tickets: result.rows.map(mapTicket) });
}

export async function POST(request: Request) {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { lineId?: string; originStopId?: string; destinationStopId?: string; ticketType?: "single" | "return" | "daily" } | null;
  if (!body?.lineId || !body.originStopId || !body.destinationStopId || !body.ticketType || !["single", "return", "daily"].includes(body.ticketType)) return NextResponse.json({ error: "Invalid ticket data" }, { status: 400 });
  const positions = await db.query(`SELECT stop_id, sequence FROM line_stops WHERE line_id=$1 AND stop_id IN ($2,$3)`, [body.lineId, body.originStopId, body.destinationStopId]);
  if (positions.rowCount !== 2) return NextResponse.json({ error: "Stops do not belong to the selected line" }, { status: 400 });
  const seq = new Map<string, number>(positions.rows.map((row: { stop_id: string; sequence: number | string }) => [row.stop_id, Number(row.sequence)]));
  const stopCount = Math.abs((seq.get(body.destinationStopId) ?? 0) - (seq.get(body.originStopId) ?? 0));
  if (stopCount < 1) return NextResponse.json({ error: "Choose two different stops" }, { status: 400 });
  const price = fareForStops(stopCount, body.ticketType);
  const publicCode = `TK-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const paymentReference = `PAY-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
  const result = await db.query(`INSERT INTO tickets(public_code,user_id,ticket_type,line_id,origin_stop_id,destination_stop_id,stop_count,price,payment_reference,payment_status)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'approved') RETURNING id`, [publicCode, session.sub, body.ticketType, body.lineId, body.originStopId, body.destinationStopId, stopCount, price, paymentReference]);
  await db.query(`INSERT INTO notifications(user_id,type,title_es,title_en,body_es,body_en)
    SELECT id,'ticket_purchase','Compra completada','Purchase completed',
           'Tu billete ${publicCode} está disponible.','Your ticket ${publicCode} is available.'
      FROM users WHERE id=$1 AND ticket_notifications=TRUE`, [session.sub]);
  await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "ticket.purchased", entityType: "ticket", entityId: String(result.rows[0].id), ipAddress: requestIp(request), details: { publicCode, ticketType: body.ticketType, price, lineId: body.lineId } });
  await trackAnalyticsEvent({ userId: session.sub, eventName: "ticket_purchased", section: "tickets", properties: { ticketType: body.ticketType, lineId: body.lineId, stopCount } });
  return NextResponse.json({ ok: true, id: result.rows[0].id, publicCode, price, paymentReference }, { status: 201 });
}
