import { NextResponse } from "next/server";
import { currentApiSession } from "@/lib/api-session";
import { db } from "@/lib/db";
import { normalizeRating, validFeedbackMessage } from "@/lib/pilot-policy.js";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";
import { trackAnalyticsEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";
const categories = ["general","route","stop","bus","accessibility","ticket"];
const entityTypes = ["line","stop","bus","ticket"];

export async function GET() {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await db.query(`SELECT id,category,entity_type,entity_id,rating,message,status,admin_response,created_at,updated_at
    FROM feedback_reports WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`, [session.sub]);
  return NextResponse.json({ feedback: result.rows.map((row: { id:string; category:string; entity_type:string|null; entity_id:string|null; rating:number|string; message:string; status:string; admin_response:string|null; created_at:Date|string; updated_at:Date|string }) => ({
    id: row.id, category: row.category, entityType: row.entity_type, entityId: row.entity_id,
    rating: Number(row.rating), message: row.message, status: row.status, adminResponse: row.admin_response,
    createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString(),
  })) });
}

export async function POST(request: Request) {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { category?: string; entityType?: string | null; entityId?: string | null; rating?: number; message?: string } | null;
  if (!body || !categories.includes(String(body.category))) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  if (body.entityType && !entityTypes.includes(String(body.entityType))) return NextResponse.json({ error: "Invalid entity" }, { status: 400 });
  if (!validFeedbackMessage(body.message)) return NextResponse.json({ error: "Message must contain between 10 and 2000 characters" }, { status: 400 });
  const recent = await db.query(`SELECT COUNT(*)::int AS count FROM feedback_reports WHERE user_id=$1 AND created_at>=NOW()-INTERVAL '1 hour'`, [session.sub]);
  if (Number(recent.rows[0]?.count ?? 0) >= 5) return NextResponse.json({ error: "Feedback limit reached. Try again later." }, { status: 429 });
  const rating = normalizeRating(body.rating);
  const result = await db.query(`INSERT INTO feedback_reports(user_id,category,entity_type,entity_id,rating,message)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING id,created_at`, [session.sub, body.category, body.entityType || null, body.entityId?.slice(0,120) || null, rating, String(body.message).trim()]);
  await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "feedback.submitted", entityType: "feedback", entityId: result.rows[0].id, ipAddress: requestIp(request), details: { category: body.category, rating } });
  await trackAnalyticsEvent({ userId: session.sub, eventName: "feedback_submitted", section: "feedback", properties: { category: body.category, rating } });
  return NextResponse.json({ ok: true, id: result.rows[0].id, createdAt: new Date(result.rows[0].created_at).toISOString() }, { status: 201 });
}
