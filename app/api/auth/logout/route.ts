import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { currentApiSession } from "@/lib/api-session";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

export async function POST(request: Request) {
  const session = await currentApiSession();
  if (session) await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "auth.logout", entityType: "user", entityId: session.sub, ipAddress: requestIp(request) });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}
