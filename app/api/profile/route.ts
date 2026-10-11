import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentApiSession } from "@/lib/api-session";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import type { AccessibilityPreferences, TextScale } from "@/lib/types";

type ProfilePatch = Partial<AccessibilityPreferences> & { language?: "es" | "en" };

function mapPreferences(row: Record<string, unknown>): AccessibilityPreferences {
  return {
    highContrast: Boolean(row.high_contrast),
    reduceMotion: Boolean(row.reduce_motion),
    textScale: row.text_scale === "large" || row.text_scale === "xlarge" ? row.text_scale : "normal",
    arrivalNotifications: row.arrival_notifications !== false,
    ticketNotifications: row.ticket_notifications !== false,
    serviceNotifications: row.service_notifications !== false,
  };
}

export async function GET() {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await db.query(
    `SELECT email, display_name, preferred_language, role,
            high_contrast, reduce_motion, text_scale,
            arrival_notifications, ticket_notifications, service_notifications, session_version
       FROM users WHERE id=$1`,
    [session.sub],
  );
  const row = result.rows[0];
  if (!row) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({
    email: row.email,
    name: row.display_name,
    language: row.preferred_language,
    role: row.role,
    preferences: mapPreferences(row),
  });
}

export async function PATCH(request: Request) {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as ProfilePatch | null;
  if (!body) return NextResponse.json({ error: "Invalid profile data" }, { status: 400 });

  if (body.language !== undefined && !["es", "en"].includes(body.language)) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }
  if (body.textScale !== undefined && !["normal", "large", "xlarge"].includes(body.textScale as TextScale)) {
    return NextResponse.json({ error: "Invalid text scale" }, { status: 400 });
  }

  const current = await db.query(
    `SELECT preferred_language, high_contrast, reduce_motion, text_scale,
            arrival_notifications, ticket_notifications, service_notifications, session_version
       FROM users WHERE id=$1`,
    [session.sub],
  );
  const row = current.rows[0];
  if (!row) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const language = body.language ?? row.preferred_language;
  const preferences: AccessibilityPreferences = {
    highContrast: body.highContrast ?? Boolean(row.high_contrast),
    reduceMotion: body.reduceMotion ?? Boolean(row.reduce_motion),
    textScale: body.textScale ?? (row.text_scale as TextScale),
    arrivalNotifications: body.arrivalNotifications ?? Boolean(row.arrival_notifications),
    ticketNotifications: body.ticketNotifications ?? Boolean(row.ticket_notifications),
    serviceNotifications: body.serviceNotifications ?? Boolean(row.service_notifications),
  };

  await db.query(
    `UPDATE users
        SET preferred_language=$1, high_contrast=$2, reduce_motion=$3, text_scale=$4,
            arrival_notifications=$5, ticket_notifications=$6, service_notifications=$7,
            updated_at=NOW()
      WHERE id=$8`,
    [language, preferences.highContrast, preferences.reduceMotion, preferences.textScale,
      preferences.arrivalNotifications, preferences.ticketNotifications, preferences.serviceNotifications, session.sub],
  );

  const token = await createSessionToken({ ...session, language, sessionVersion: Number(row.session_version ?? session.sessionVersion) });
  const response = NextResponse.json({ ok: true, language, preferences });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.FORCE_HTTPS === "true",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return response;
}
