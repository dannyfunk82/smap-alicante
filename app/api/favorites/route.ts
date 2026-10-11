import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentApiSession } from "@/lib/api-session";
import { trackAnalyticsEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const locale = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "es";
  const result = await db.query(`
    SELECT f.id, f.favorite_type, f.entity_id, f.created_at,
      CASE WHEN f.favorite_type = 'line' THEN ${locale === "en" ? "l.name_en" : "l.name_es"} ELSE ${locale === "en" ? "s.name_en" : "s.name_es"} END AS title,
      CASE WHEN f.favorite_type = 'line' THEN l.code ELSE s.code END AS subtitle,
      l.color
    FROM favorites f
    LEFT JOIN lines l ON f.favorite_type = 'line' AND l.id = f.entity_id
    LEFT JOIN stops s ON f.favorite_type = 'stop' AND s.id = f.entity_id
    WHERE f.user_id = $1 ORDER BY f.created_at DESC`, [session.sub]);
  return NextResponse.json({ favorites: result.rows.map((row: Record<string, any>) => ({ id: row.id, type: row.favorite_type, entityId: row.entity_id, title: row.title, subtitle: row.subtitle, color: row.color ?? undefined, createdAt: row.created_at })) });
}

export async function POST(request: Request) {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { type?: "line" | "stop"; entityId?: string } | null;
  if (!body?.type || !body.entityId || !["line", "stop"].includes(body.type)) return NextResponse.json({ error: "Invalid favorite" }, { status: 400 });
  const table = body.type === "line" ? "lines" : "stops";
  const exists = await db.query(`SELECT 1 FROM ${table} WHERE id = $1`, [body.entityId]);
  if (!exists.rowCount) return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  const result = await db.query(`INSERT INTO favorites(user_id, favorite_type, entity_id) VALUES ($1, $2, $3)
    ON CONFLICT (user_id, favorite_type, entity_id) DO UPDATE SET created_at = favorites.created_at RETURNING id`, [session.sub, body.type, body.entityId]);
  await trackAnalyticsEvent({ userId: session.sub, eventName: "favorite_added", section: "favorites", properties: { type: body.type } });
  return NextResponse.json({ ok: true, id: result.rows[0].id }, { status: 201 });
}
