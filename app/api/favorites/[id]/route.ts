import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentApiSession } from "@/lib/api-session";

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  await db.query("DELETE FROM favorites WHERE id = $1 AND user_id = $2", [id, session.sub]);
  return NextResponse.json({ ok: true });
}
