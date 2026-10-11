import { NextResponse } from "next/server";
import { currentApiSession } from "@/lib/api-session";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

export const dynamic = "force-dynamic";
const stepColumns = {
  welcome: "welcome_completed",
  profile: "profile_completed",
  accessibility: "accessibility_completed",
  route: "route_completed",
  ticket: "ticket_completed",
  feedback: "feedback_completed",
} as const;

type ProgressRow = Record<string, boolean | string | Date | null>;

function serialize(row: ProgressRow | undefined) {
  const progress = {
    welcome: Boolean(row?.welcome_completed), profile: Boolean(row?.profile_completed),
    accessibility: Boolean(row?.accessibility_completed), route: Boolean(row?.route_completed),
    ticket: Boolean(row?.ticket_completed), feedback: Boolean(row?.feedback_completed),
  };
  const completed = Object.values(progress).filter(Boolean).length;
  return { progress, completed, total: 6, percentage: Math.round((completed / 6) * 100), completedAt: row?.completed_at ? new Date(row.completed_at as Date | string).toISOString() : null };
}

export async function GET() {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await db.query("INSERT INTO onboarding_progress(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING", [session.sub]);
  const [progress, membership] = await Promise.all([
    db.query("SELECT * FROM onboarding_progress WHERE user_id=$1", [session.sub]),
    db.query(`SELECT pm.status,pm.joined_at,pc.code AS cohort_code,pc.name AS cohort_name
      FROM pilot_memberships pm JOIN pilot_cohorts pc ON pc.id=pm.cohort_id WHERE pm.user_id=$1`, [session.sub]),
  ]);
  return NextResponse.json({ ...serialize(progress.rows[0]), membership: membership.rows[0] ? { status: membership.rows[0].status, cohortCode: membership.rows[0].cohort_code, cohortName: membership.rows[0].cohort_name, joinedAt: new Date(membership.rows[0].joined_at).toISOString() } : null });
}

export async function PATCH(request: Request) {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { step?: keyof typeof stepColumns; completed?: boolean } | null;
  if (!body?.step || !(body.step in stepColumns)) return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  const column = stepColumns[body.step];
  await db.query("INSERT INTO onboarding_progress(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING", [session.sub]);
  await db.query(`UPDATE onboarding_progress SET ${column}=$2,updated_at=NOW() WHERE user_id=$1`, [session.sub, body.completed !== false]);
  await db.query(`UPDATE onboarding_progress SET completed_at=CASE WHEN welcome_completed AND profile_completed AND accessibility_completed AND route_completed AND ticket_completed AND feedback_completed THEN COALESCE(completed_at,NOW()) ELSE NULL END WHERE user_id=$1`, [session.sub]);
  const result = await db.query("SELECT * FROM onboarding_progress WHERE user_id=$1", [session.sub]);
  await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "pilot.onboarding_updated", entityType: "onboarding", entityId: session.sub, ipAddress: requestIp(request), details: { step: body.step, completed: body.completed !== false } });
  return NextResponse.json(serialize(result.rows[0]));
}
