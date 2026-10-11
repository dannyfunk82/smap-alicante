import { NextResponse } from "next/server";
import { currentApiSession } from "@/lib/api-session";
import { trackAnalyticsEvent } from "@/lib/analytics";

export async function POST(request: Request) {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await request.json().catch(() => null) as { eventName?: string; section?: string; properties?: Record<string, unknown> } | null;
  if (!body?.eventName) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  const tracked = await trackAnalyticsEvent({ userId: session.sub, eventName: body.eventName, section: body.section?.slice(0,80) ?? null, properties: body.properties ?? {} });
  return NextResponse.json({ ok: true, tracked });
}
