import { NextResponse } from "next/server";
import { currentApiSession } from "@/lib/api-session";
import { db } from "@/lib/db";

export async function PATCH() {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await db.query("UPDATE notifications SET read_at=COALESCE(read_at,NOW()) WHERE user_id=$1", [session.sub]);
  return NextResponse.json({ ok: true });
}
