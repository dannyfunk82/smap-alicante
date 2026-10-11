import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { collectPilotClosureMetrics, pilotClosureFindings } from "@/lib/pilot-closure";
import { recordAudit } from "@/lib/audit";

export async function POST(request:Request){
  const session=await currentAdminSession();if(!session)return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await request.json().catch(()=>({})) as {cohortId?:string;periodStart?:string;periodEnd?:string};
  const metrics=await collectPilotClosureMetrics();const findings=pilotClosureFindings(metrics);
  const periodEnd=body.periodEnd||new Date().toISOString().slice(0,10);const periodStart=body.periodStart||new Date(Date.now()-30*86400000).toISOString().slice(0,10);
  const result=await db.query(`INSERT INTO pilot_kpi_snapshots(cohort_id,period_start,period_end,metrics,findings,generated_by) VALUES(NULLIF($1,'')::uuid,$2::date,$3::date,$4::jsonb,$5::jsonb,$6) RETURNING id`,[body.cohortId||"",periodStart,periodEnd,JSON.stringify(metrics),JSON.stringify(findings),session.sub]);
  await recordAudit({actorUserId:session.sub,actorEmail:session.email,action:"pilot.snapshot_created",entityType:"pilot_kpi_snapshot",entityId:result.rows[0].id,details:{periodStart,periodEnd}});
  return NextResponse.json({ok:true,id:result.rows[0].id},{status:201});
}
