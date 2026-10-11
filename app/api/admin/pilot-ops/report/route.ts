import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

export async function POST(request:Request){
  const session=await currentAdminSession();if(!session)return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await request.json().catch(()=>({})) as {cohortId?:string|null;periodStart?:string;periodEnd?:string};
  const end=body.periodEnd&&/^\d{4}-\d{2}-\d{2}$/.test(body.periodEnd)?body.periodEnd:new Date().toISOString().slice(0,10);
  const start=body.periodStart&&/^\d{4}-\d{2}-\d{2}$/.test(body.periodStart)?body.periodStart:new Date(Date.now()-13*86400000).toISOString().slice(0,10);
  const result=await db.query(`SELECT
    (SELECT COUNT(*)::int FROM pilot_memberships WHERE ($1::uuid IS NULL OR cohort_id=$1)) AS members,
    (SELECT COUNT(*)::int FROM onboarding_progress op JOIN pilot_memberships pm ON pm.user_id=op.user_id WHERE op.completed_at IS NOT NULL AND ($1::uuid IS NULL OR pm.cohort_id=$1)) AS onboarded,
    (SELECT COUNT(*)::int FROM support_cases WHERE created_at::date BETWEEN $2::date AND $3::date) AS support_cases,
    (SELECT COUNT(*)::int FROM feedback_reports WHERE created_at::date BETWEEN $2::date AND $3::date) AS feedback,
    (SELECT COALESCE(ROUND(AVG(rating)::numeric,2),0) FROM feedback_reports WHERE created_at::date BETWEEN $2::date AND $3::date) AS average_rating,
    (SELECT COUNT(*)::int FROM tickets WHERE purchased_at::date BETWEEN $2::date AND $3::date) AS tickets`,[body.cohortId||null,start,end]);
  const summary={...result.rows[0],periodStart:start,periodEnd:end};
  const saved=await db.query(`INSERT INTO pilot_report_snapshots(cohort_id,generated_by,period_start,period_end,summary) VALUES($1,$2,$3,$4,$5::jsonb) RETURNING id,created_at`,[body.cohortId||null,session.sub,start,end,JSON.stringify(summary)]);
  await recordAudit({actorUserId:session.sub,actorEmail:session.email,action:"pilot.report_generated",entityType:"pilot_report",entityId:saved.rows[0].id,ipAddress:requestIp(request),details:{start,end}});
  return NextResponse.json({id:saved.rows[0].id,createdAt:new Date(saved.rows[0].created_at).toISOString(),summary});
}
