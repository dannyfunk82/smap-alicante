import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentApiSession } from "@/lib/api-session";
import { SESSION_COOKIE } from "@/lib/auth";
import { validatePassword } from "@/lib/security.js";
import { requestIp } from "@/lib/request";
import { recordAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { currentPassword?: string; newPassword?: string } | null;
  const currentPassword = body?.currentPassword ?? "";
  const newPassword = body?.newPassword ?? "";
  const policy = validatePassword(newPassword);
  if (!policy.valid) {
    return NextResponse.json({ error: "La nuova password deve avere almeno 10 caratteri, maiuscola, minuscola, numero e simbolo." }, { status: 400 });
  }
  if (currentPassword === newPassword) return NextResponse.json({ error: "La nuova password deve essere diversa." }, { status: 400 });

  const result = await db.query("SELECT password_hash FROM users WHERE id=$1", [session.sub]);
  if (!result.rowCount || !(await bcrypt.compare(currentPassword, result.rows[0].password_hash))) {
    await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "security.password_change_failed", entityType: "user", entityId: session.sub, ipAddress: requestIp(request) });
    return NextResponse.json({ error: "Password attuale non corretta" }, { status: 401 });
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await db.query(
    `UPDATE users SET password_hash=$1, password_changed_at=NOW(), session_version=session_version+1,
                      failed_login_attempts=0, locked_until=NULL, updated_at=NOW()
      WHERE id=$2`,
    [hash, session.sub],
  );
  await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "security.password_changed", entityType: "user", entityId: session.sub, ipAddress: requestIp(request) });
  const response = NextResponse.json({ ok: true, reauthenticate: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}
