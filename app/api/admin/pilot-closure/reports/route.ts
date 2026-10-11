import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { collectPilotClosureMetrics, pilotClosureFindings, reportSummary } from "@/lib/pilot-closure";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

export async function POST(request:Request){
  const session=await currentAdminSession();if(!session)return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await request.json().catch(()=>null) as {action?:"generate"|"finalize";reportId?:string;cohortId?:string;title?:string;risks?:string[]}|null;
  if(body?.action==="finalize"){
    if(!body.reportId)return NextResponse.json({error:"Report id required"},{status:400});
    const result=await db.query(`UPDATE pilot_final_reports SET status='final',published_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING id`,[body.reportId]);
    if(!result.rowCount)return NextResponse.json({error:"Report not found"},{status:404});
    await recordAudit({actorUserId:session.sub,actorEmail:session.email,action:"pilot.report_finalized",entityType:"pilot_final_report",entityId:body.reportId,ipAddress:requestIp(request)});
    return NextResponse.json({ok:true});
  }
  const metrics=await collectPilotClosureMetrics();const findings=pilotClosureFindings(metrics);const risks=Array.isArray(body?.risks)?body.risks.map(String).filter(Boolean).slice(0,20):metrics.criticalOpenActions?["Critical improvement actions remain open."]:[];
  const result=await db.query(`INSERT INTO pilot_final_reports(cohort_id,title,executive_summary_es,executive_summary_en,recommendation,metrics,findings,risks,generated_by)
    VALUES(NULLIF($1,'')::uuid,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9) RETURNING id`,[body?.cohortId||"",body?.title?.trim()||"SMAP Pilot Final Report",reportSummary(metrics,"es"),reportSummary(metrics,"en"),metrics.recommendation,JSON.stringify(metrics),JSON.stringify(findings),JSON.stringify(risks),session.sub]);
  await recordAudit({actorUserId:session.sub,actorEmail:session.email,action:"pilot.report_generated",entityType:"pilot_final_report",entityId:result.rows[0].id,ipAddress:requestIp(request),details:{recommendation:metrics.recommendation,score:metrics.readinessScore}});
  return NextResponse.json({ok:true,id:result.rows[0].id},{status:201});
}
