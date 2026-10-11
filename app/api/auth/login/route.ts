import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { isRateLimited, recordAuthAttempt } from "@/lib/auth-rate";
import { lockUntil, remainingLockMinutes, shouldLockAccount } from "@/lib/security.js";
import { requestIp } from "@/lib/request";
import { recordAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;
  const ip = requestIp(request);
  if (!email || !password) return NextResponse.json({ error: "Email e password sono obbligatorie" }, { status: 400 });
  if (await isRateLimited(ip, "login")) {
    await recordAudit({ actorEmail: email, action: "auth.rate_limited", entityType: "user", ipAddress: ip });
    return NextResponse.json({ error: "Troppi tentativi. Riprova più tardi." }, { status: 429 });
  }

  const result = await db.query(
    `SELECT id, email, password_hash, display_name, preferred_language, role,
            failed_login_attempts, locked_until, session_version, account_status
       FROM users WHERE email = $1`,
    [email],
  );
  const user = result.rows[0];
  if (user?.account_status === "disabled") {
    await recordAuthAttempt({ email, ip, eventType: "login", success: false });
    return NextResponse.json({ error: "Account disabilitato" }, { status: 403 });
  }
  const lockMinutes = user ? remainingLockMinutes(user.locked_until) : 0;
  if (lockMinutes > 0) {
    await recordAuthAttempt({ email, ip, eventType: "login", success: false });
    return NextResponse.json({ error: `Account temporaneamente bloccato. Riprova tra ${lockMinutes} min.` }, { status: 423 });
  }

  const valid = Boolean(user && await bcrypt.compare(password, user.password_hash));
  if (!valid) {
    await recordAuthAttempt({ email, ip, eventType: "login", success: false });
    if (user) {
      const nextFailures = Number(user.failed_login_attempts ?? 0) + 1;
      await db.query(
        `UPDATE users SET failed_login_attempts=$1, locked_until=$2, updated_at=NOW() WHERE id=$3`,
        [nextFailures, shouldLockAccount(nextFailures) ? lockUntil() : null, user.id],
      );
    }
    await recordAudit({ actorUserId: user?.id ?? null, actorEmail: email, action: "auth.login_failed", entityType: "user", entityId: user?.id ?? null, ipAddress: ip });
    return NextResponse.json({ error: "Credenziali non valide" }, { status: 401 });
  }

  await db.query(
    `UPDATE users SET failed_login_attempts=0, locked_until=NULL, last_login_at=NOW(), updated_at=NOW() WHERE id=$1`,
    [user.id],
  );
  await recordAuthAttempt({ email, ip, eventType: "login", success: true });
  await recordAudit({ actorUserId: user.id, actorEmail: user.email, action: "auth.login_success", entityType: "user", entityId: user.id, ipAddress: ip });

  const token = await createSessionToken({
    sub: user.id,
    email: user.email,
    name: user.display_name,
    language: user.preferred_language === "en" ? "en" : "es",
    role: user.role === "admin" ? "admin" : "citizen",
    sessionVersion: Number(user.session_version ?? 1),
  });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.FORCE_HTTPS === "true",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return response;
}
