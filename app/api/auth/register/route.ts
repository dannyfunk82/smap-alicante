import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { isRateLimited, recordAuthAttempt } from "@/lib/auth-rate";
import { validatePassword } from "@/lib/security.js";
import { requestIp } from "@/lib/request";
import { recordAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { name?: string; email?: string; password?: string; privacyAccepted?: boolean; pilotParticipant?: boolean } | null;
  const name = body?.name?.trim();
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";
  const ip = requestIp(request);

  if (!name || !email) return NextResponse.json({ error: "Inserisci nome ed email" }, { status: 400 });
  if (!body?.privacyAccepted) return NextResponse.json({ error: "Devi accettare l’avviso di privacy e le condizioni della demo." }, { status: 400 });
  const policy = validatePassword(password);
  if (!policy.valid) {
    return NextResponse.json({ error: "La password deve avere almeno 10 caratteri, maiuscola, minuscola, numero e simbolo." }, { status: 400 });
  }
  if (await isRateLimited(ip, "register")) return NextResponse.json({ error: "Troppe registrazioni. Riprova più tardi." }, { status: 429 });

  const existing = await db.query("SELECT 1 FROM users WHERE email = $1", [email]);
  if (existing.rowCount) {
    await recordAuthAttempt({ email, ip, eventType: "register", success: false });
    return NextResponse.json({ error: "Email già registrata" }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 12);
  const result = await db.query(
    `INSERT INTO users(email, password_hash, display_name, preferred_language, password_changed_at,privacy_notice_version,privacy_accepted_at,pilot_participant)
     VALUES ($1, $2, $3, 'es', NOW(),'2026-07',NOW(),$4)
     RETURNING id, email, display_name, preferred_language, role, session_version`,
    [email, hash, name, Boolean(body.pilotParticipant)],
  );
  const user = result.rows[0];
  await db.query(`INSERT INTO user_consents(user_id,consent_type,document_version,granted) VALUES($1,'privacy','2026-07',TRUE),($1,'terms','2026-07',TRUE),($1,'pilot',NULL,$2)`, [user.id, Boolean(body.pilotParticipant)]);
  await recordAuthAttempt({ email, ip, eventType: "register", success: true });
  await recordAudit({ actorUserId: user.id, actorEmail: user.email, action: "auth.registered", entityType: "user", entityId: user.id, ipAddress: ip });
  const token = await createSessionToken({
    sub: user.id,
    email: user.email,
    name: user.display_name,
    language: "es",
    role: "citizen",
    sessionVersion: Number(user.session_version ?? 1),
  });
  const response = NextResponse.json({ ok: true }, { status: 201 });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.FORCE_HTTPS === "true",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return response;
}
