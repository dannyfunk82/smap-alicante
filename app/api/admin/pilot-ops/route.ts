import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
type DbRow = Record<string, any>;

export async function GET() {
  const session = await currentAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [metrics, cohorts, invites, support, checklist, members] = await Promise.all([
    db.query(`SELECT
      (SELECT COUNT(*)::int FROM pilot_memberships WHERE status='active') AS active_members,
      (SELECT COUNT(*)::int FROM onboarding_progress WHERE completed_at IS NOT NULL) AS onboarding_completed,
      (SELECT COUNT(*)::int FROM support_cases WHERE status IN ('open','in_progress')) AS open_support,
      (SELECT COUNT(*)::int FROM pilot_invites WHERE status='active' AND (expires_at IS NULL OR expires_at>NOW())) AS active_invites,
      (SELECT COUNT(*)::int FROM pilot_checklist WHERE completed=TRUE) AS checklist_completed,
      (SELECT COUNT(*)::int FROM pilot_checklist) AS checklist_total`),
    db.query(`SELECT pc.*,COUNT(pm.user_id)::int AS member_count FROM pilot_cohorts pc LEFT JOIN pilot_memberships pm ON pm.cohort_id=pc.id AND pm.status='active' GROUP BY pc.id ORDER BY pc.created_at DESC`),
    db.query(`SELECT pi.id,pi.code,pi.email,pi.max_uses,pi.used_count,pi.expires_at,pi.status,pi.created_at,pc.code AS cohort_code,pc.name AS cohort_name
      FROM pilot_invites pi JOIN pilot_cohorts pc ON pc.id=pi.cohort_id ORDER BY pi.created_at DESC LIMIT 100`),
    db.query(`SELECT sc.id,sc.category,sc.priority,sc.subject,sc.message,sc.status,sc.admin_response,sc.created_at,sc.updated_at,u.email,u.display_name
      FROM support_cases sc JOIN users u ON u.id=sc.user_id ORDER BY CASE sc.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,CASE sc.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,sc.created_at DESC LIMIT 100`),
    db.query(`SELECT id,item_key,title_es,title_en,completed,notes,completed_at,updated_at FROM pilot_checklist ORDER BY id`),
    db.query(`SELECT pm.user_id,pm.status,pm.joined_at,u.email,u.display_name,pc.code AS cohort_code,pc.name AS cohort_name,
      op.completed_at,(COALESCE(op.welcome_completed,FALSE)::int+COALESCE(op.profile_completed,FALSE)::int+COALESCE(op.accessibility_completed,FALSE)::int+COALESCE(op.route_completed,FALSE)::int+COALESCE(op.ticket_completed,FALSE)::int+COALESCE(op.feedback_completed,FALSE)::int) AS steps
      FROM pilot_memberships pm JOIN users u ON u.id=pm.user_id JOIN pilot_cohorts pc ON pc.id=pm.cohort_id LEFT JOIN onboarding_progress op ON op.user_id=pm.user_id ORDER BY pm.joined_at DESC LIMIT 100`),
  ]);
  const m = metrics.rows[0];
  return NextResponse.json({
    metrics: { activeMembers:Number(m.active_members), onboardingCompleted:Number(m.onboarding_completed), openSupport:Number(m.open_support), activeInvites:Number(m.active_invites), checklistCompleted:Number(m.checklist_completed), checklistTotal:Number(m.checklist_total) },
    cohorts: cohorts.rows.map((r: DbRow) => ({ id:r.id,code:r.code,name:r.name,targetParticipants:Number(r.target_participants),startsAt:r.starts_at?String(r.starts_at).slice(0,10):null,endsAt:r.ends_at?String(r.ends_at).slice(0,10):null,status:r.status,memberCount:Number(r.member_count),createdAt:new Date(r.created_at).toISOString() })),
    invites: invites.rows.map((r: DbRow) => ({ id:r.id,code:r.code,email:r.email,maxUses:Number(r.max_uses),usedCount:Number(r.used_count),expiresAt:r.expires_at?new Date(r.expires_at).toISOString():null,status:r.status,cohortCode:r.cohort_code,cohortName:r.cohort_name,createdAt:new Date(r.created_at).toISOString() })),
    support: support.rows.map((r: DbRow) => ({ id:r.id,category:r.category,priority:r.priority,subject:r.subject,message:r.message,status:r.status,adminResponse:r.admin_response,userEmail:r.email,userName:r.display_name,createdAt:new Date(r.created_at).toISOString(),updatedAt:new Date(r.updated_at).toISOString() })),
    checklist: checklist.rows.map((r: DbRow) => ({ id:Number(r.id),key:r.item_key,titleEs:r.title_es,titleEn:r.title_en,completed:Boolean(r.completed),notes:r.notes,completedAt:r.completed_at?new Date(r.completed_at).toISOString():null,updatedAt:new Date(r.updated_at).toISOString() })),
    members: members.rows.map((r: DbRow) => ({ userId:r.user_id,email:r.email,name:r.display_name,cohortCode:r.cohort_code,cohortName:r.cohort_name,status:r.status,joinedAt:new Date(r.joined_at).toISOString(),steps:Number(r.steps),completedAt:r.completed_at?new Date(r.completed_at).toISOString():null })),
  });
}
