import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { actionPriorityScore } from "@/lib/closure-policy.js";
import { collectPilotClosureMetrics, pilotClosureFindings } from "@/lib/pilot-closure";

export const dynamic = "force-dynamic";

type ActionRow={id:string;cohort_code:string|null;title_es:string;title_en:string;description_es:string;description_en:string;category:string;priority:string;impact:string;effort:string;status:string;owner:string|null;target_date:Date|string|null;source_type:string;source_reference:string|null;created_at:Date|string;updated_at:Date|string};
type DecisionRow={id:string;action_id:string|null;action_title:string|null;title:string;decision:string;rationale:string;decided_by:string|null;decided_at:Date|string};
type SnapshotRow={id:string;period_start:Date|string;period_end:Date|string;metrics:Record<string,unknown>;findings:Array<Record<string,unknown>>;created_at:Date|string};
type ReportRow={id:string;title:string;status:string;executive_summary_es:string;executive_summary_en:string;recommendation:string;metrics:Record<string,unknown>;findings:Array<Record<string,unknown>>;risks:string[];published_at:Date|string|null;created_at:Date|string;updated_at:Date|string};

export async function GET(){
  if(!await currentAdminSession()) return NextResponse.json({error:"Forbidden"},{status:403});
  const [metrics, cohorts, actions, decisions, snapshots, reports]=await Promise.all([
    collectPilotClosureMetrics(),
    db.query("SELECT id,code,name FROM pilot_cohorts ORDER BY created_at DESC"),
    db.query(`SELECT a.*,c.code AS cohort_code FROM pilot_improvement_actions a LEFT JOIN pilot_cohorts c ON c.id=a.cohort_id ORDER BY a.updated_at DESC`),
    db.query(`SELECT d.*,a.title_es AS action_title,u.email AS decided_by FROM pilot_decisions d LEFT JOIN pilot_improvement_actions a ON a.id=d.action_id LEFT JOIN users u ON u.id=d.decided_by ORDER BY d.decided_at DESC LIMIT 100`),
    db.query(`SELECT id,period_start,period_end,metrics,findings,created_at FROM pilot_kpi_snapshots ORDER BY created_at DESC LIMIT 20`),
    db.query(`SELECT id,title,status,executive_summary_es,executive_summary_en,recommendation,metrics,findings,risks,published_at,created_at,updated_at FROM pilot_final_reports ORDER BY created_at DESC LIMIT 20`),
  ]);
  return NextResponse.json({
    metrics,
    findings:pilotClosureFindings(metrics).map((item)=>({tone:item.tone,code:item.code,text:item.es})),
    cohorts:cohorts.rows,
    actions:(actions.rows as ActionRow[]).map((row)=>({id:row.id,cohortCode:row.cohort_code,titleEs:row.title_es,titleEn:row.title_en,descriptionEs:row.description_es,descriptionEn:row.description_en,category:row.category,priority:row.priority,impact:row.impact,effort:row.effort,status:row.status,owner:row.owner,targetDate:row.target_date?new Date(row.target_date).toISOString().slice(0,10):null,sourceType:row.source_type,sourceReference:row.source_reference,priorityScore:actionPriorityScore(row.priority,row.impact,row.effort),createdAt:new Date(row.created_at).toISOString(),updatedAt:new Date(row.updated_at).toISOString()})).sort((a,b)=>b.priorityScore-a.priorityScore),
    decisions:(decisions.rows as DecisionRow[]).map((row)=>({id:row.id,actionId:row.action_id,actionTitle:row.action_title,title:row.title,decision:row.decision,rationale:row.rationale,decidedBy:row.decided_by,decidedAt:new Date(row.decided_at).toISOString()})),
    snapshots:(snapshots.rows as SnapshotRow[]).map((row)=>({id:row.id,periodStart:new Date(row.period_start).toISOString().slice(0,10),periodEnd:new Date(row.period_end).toISOString().slice(0,10),metrics:row.metrics,findings:row.findings,createdAt:new Date(row.created_at).toISOString()})),
    reports:(reports.rows as ReportRow[]).map((row)=>({id:row.id,title:row.title,status:row.status,executiveSummaryEs:row.executive_summary_es,executiveSummaryEn:row.executive_summary_en,recommendation:row.recommendation,metrics:row.metrics,findings:row.findings,risks:row.risks,publishedAt:row.published_at?new Date(row.published_at).toISOString():null,createdAt:new Date(row.created_at).toISOString(),updatedAt:new Date(row.updated_at).toISOString()})),
  });
}
