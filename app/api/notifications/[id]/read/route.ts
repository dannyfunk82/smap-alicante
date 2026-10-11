import { NextResponse } from "next/server";
import { currentApiSession } from "@/lib/api-session";
import { db } from "@/lib/db";

export async function PATCH(_: Request, context: { params: Promise<{ id: string }> }) {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const result = await db.query("UPDATE notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=$1 AND user_id=$2 RETURNING id", [id, session.sub]);
  if (!result.rowCount) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
