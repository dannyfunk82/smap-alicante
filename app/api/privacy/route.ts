import { NextResponse } from "next/server";
import { currentApiSession } from "@/lib/api-session";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";
import { trackAnalyticsEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const locale = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "es";
  const [profile, documents] = await Promise.all([
    db.query(`SELECT privacy_notice_version,privacy_accepted_at,analytics_consent,pilot_participant,deletion_requested_at
      FROM users WHERE id=$1`, [session.sub]),
    db.query(`SELECT document_type,version,title_es,title_en,content_es,content_en,published_at
      FROM privacy_documents WHERE active=TRUE ORDER BY document_type,published_at DESC`),
  ]);
  const row = profile.rows[0];
  return NextResponse.json({
    privacyAccepted: Boolean(row?.privacy_accepted_at),
    privacyVersion: row?.privacy_notice_version ?? null,
    privacyAcceptedAt: row?.privacy_accepted_at ? new Date(row.privacy_accepted_at).toISOString() : null,
    analyticsConsent: Boolean(row?.analytics_consent),
    pilotParticipant: Boolean(row?.pilot_participant),
    deletionRequestedAt: row?.deletion_requested_at ? new Date(row.deletion_requested_at).toISOString() : null,
    documents: documents.rows.map((doc: { document_type:string; version:string; title_es:string; title_en:string; content_es:string; content_en:string; published_at:Date|string }) => ({
      type: doc.document_type, version: doc.version,
      title: locale === "en" ? doc.title_en : doc.title_es,
      content: locale === "en" ? doc.content_en : doc.content_es,
      publishedAt: new Date(doc.published_at).toISOString(),
    })),
  });
}

export async function PATCH(request: Request) {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { analyticsConsent?: boolean; pilotParticipant?: boolean; acceptCurrent?: boolean } | null;
  if (!body) return NextResponse.json({ error: "Invalid privacy preferences" }, { status: 400 });
  const current = await db.query(`SELECT analytics_consent,pilot_participant,privacy_notice_version,privacy_accepted_at FROM users WHERE id=$1`, [session.sub]);
  const row = current.rows[0];
  if (!row) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const latest = await db.query(`SELECT document_type,version FROM privacy_documents WHERE active=TRUE ORDER BY published_at DESC`);
  const currentVersion = latest.rows.find((doc: { document_type:string; version:string }) => doc.document_type === 'privacy')?.version ?? "2026-07";
  const termsVersion = latest.rows.find((doc: { document_type:string; version:string }) => doc.document_type === 'terms')?.version ?? currentVersion;
  const analyticsConsent = body.analyticsConsent ?? Boolean(row.analytics_consent);
  const pilotParticipant = body.pilotParticipant ?? Boolean(row.pilot_participant);
  const acceptCurrent = Boolean(body.acceptCurrent);
  await db.query(`UPDATE users SET analytics_consent=$2,pilot_participant=$3,
      privacy_notice_version=CASE WHEN $4 THEN $5 ELSE privacy_notice_version END,
      privacy_accepted_at=CASE WHEN $4 THEN NOW() ELSE privacy_accepted_at END,updated_at=NOW() WHERE id=$1`,
    [session.sub, analyticsConsent, pilotParticipant, acceptCurrent, currentVersion]);
  const consentRows: Array<[string, string | null, boolean]> = [];
  if (analyticsConsent !== Boolean(row.analytics_consent)) consentRows.push(["analytics", null, analyticsConsent]);
  if (pilotParticipant !== Boolean(row.pilot_participant)) consentRows.push(["pilot", null, pilotParticipant]);
  if (acceptCurrent) { consentRows.push(["privacy", currentVersion, true]); consentRows.push(["terms", termsVersion, true]); }
  for (const [type, version, granted] of consentRows) {
    await db.query(`INSERT INTO user_consents(user_id,consent_type,document_version,granted) VALUES($1,$2,$3,$4)`, [session.sub, type, version, granted]);
  }
  await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "privacy.preferences_updated", entityType: "user", entityId: session.sub, ipAddress: requestIp(request), details: { analyticsConsent, pilotParticipant, acceptCurrent, currentVersion } });
  await trackAnalyticsEvent({ userId: session.sub, eventName: "privacy_updated", section: "privacy", properties: { analyticsConsent, pilotParticipant } });
  return NextResponse.json({ ok: true, analyticsConsent, pilotParticipant, privacyVersion: acceptCurrent ? currentVersion : row.privacy_notice_version });
}
