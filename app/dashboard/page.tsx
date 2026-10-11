import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { db } from "@/lib/db";
import type { DashboardUser, TextScale } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");
  const session = await verifySessionToken(token);
  if (!session) redirect("/login");

  const result = await db.query(
    `SELECT high_contrast, reduce_motion, text_scale,
            arrival_notifications, ticket_notifications, service_notifications,
            session_version, account_status, privacy_notice_version, privacy_accepted_at,
            analytics_consent, pilot_participant, deletion_requested_at
       FROM users WHERE id=$1`,
    [session.sub],
  );
  const row = result.rows[0];
  if (!row || row.account_status !== "active" || Number(row.session_version) !== session.sessionVersion) redirect("/login");
  const user: DashboardUser = {
    id: session.sub,
    email: session.email,
    name: session.name,
    language: session.language,
    role: session.role,
    preferences: {
      highContrast: Boolean(row.high_contrast),
      reduceMotion: Boolean(row.reduce_motion),
      textScale: row.text_scale === "large" || row.text_scale === "xlarge" ? row.text_scale as TextScale : "normal",
      arrivalNotifications: row.arrival_notifications !== false,
      ticketNotifications: row.ticket_notifications !== false,
      serviceNotifications: row.service_notifications !== false,
    },
    privacy: {
      privacyAccepted: Boolean(row.privacy_accepted_at),
      privacyVersion: row.privacy_notice_version ?? null,
      analyticsConsent: Boolean(row.analytics_consent),
      pilotParticipant: Boolean(row.pilot_participant),
      deletionRequestedAt: row.deletion_requested_at ? new Date(row.deletion_requested_at).toISOString() : null,
    },
  };

  return <DashboardShell user={user} />;
}
