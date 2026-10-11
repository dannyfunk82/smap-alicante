import { NextResponse } from "next/server";
import { currentApiSession } from "@/lib/api-session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const locale = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "es";
  const title = locale === "en" ? "title_en" : "title_es";
  const body = locale === "en" ? "body_en" : "body_es";
  const result = await db.query(`SELECT id,type,${title} AS title,${body} AS body,read_at,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`, [session.sub]);
  return NextResponse.json({
    notifications: result.rows.map((row: Record<string, any>) => ({ id: row.id, type: row.type, title: row.title, body: row.body, readAt: row.read_at, createdAt: row.created_at })),
    unreadCount: result.rows.filter((row: Record<string, any>) => !row.read_at).length,
  });
}
