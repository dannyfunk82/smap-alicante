import { NextResponse } from "next/server";
import { currentApiSession } from "@/lib/api-session";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

const categories = ["technical","account","accessibility","ticket","service"];
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await db.query(`SELECT id,category,priority,subject,message,status,admin_response,created_at,updated_at
    FROM support_cases WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`, [session.sub]);
  return NextResponse.json({ cases: result.rows.map((row: Record<string, any>) => ({ id: row.id, category: row.category, priority: row.priority, subject: row.subject, message: row.message, status: row.status, adminResponse: row.admin_response, createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString() })) });
}

export async function POST(request: Request) {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { category?: string; subject?: string; message?: string } | null;
  const category = String(body?.category ?? ""); const subject = String(body?.subject ?? "").trim(); const message = String(body?.message ?? "").trim();
  if (!categories.includes(category) || subject.length < 4 || subject.length > 120 || message.length < 10 || message.length > 3000) return NextResponse.json({ error: "Invalid support request" }, { status: 400 });
  const recent = await db.query("SELECT COUNT(*)::int AS count FROM support_cases WHERE user_id=$1 AND created_at>=NOW()-INTERVAL '1 hour'", [session.sub]);
  if (Number(recent.rows[0]?.count ?? 0) >= 3) return NextResponse.json({ error: "Support request limit reached" }, { status: 429 });
  const priority = category === "accessibility" || category === "account" ? "high" : "normal";
  const result = await db.query(`INSERT INTO support_cases(user_id,category,priority,subject,message) VALUES($1,$2,$3,$4,$5) RETURNING id,created_at`, [session.sub, category, priority, subject, message]);
  await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "support.case_created", entityType: "support_case", entityId: result.rows[0].id, ipAddress: requestIp(request), details: { category, priority } });
  return NextResponse.json({ ok: true, id: result.rows[0].id, createdAt: new Date(result.rows[0].created_at).toISOString() }, { status: 201 });
}
