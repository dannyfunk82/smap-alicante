import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collectPilotClosureMetrics, pilotClosureFindings } from "@/lib/pilot-closure";

export const dynamic="force-dynamic";
export async function GET(request:Request){
  const locale=new URL(request.url).searchParams.get("lang")==="en"?"en":"es";
  const metrics=await collectPilotClosureMetrics();const findings=pilotClosureFindings(metrics).map((item)=>({tone:item.tone,code:item.code,text:locale==="en"?item.en:item.es}));
  const report=await db.query(`SELECT id,title,status,executive_summary_es,executive_summary_en,recommendation,metrics,findings,risks,published_at,created_at,updated_at FROM pilot_final_reports WHERE status='final' ORDER BY published_at DESC NULLS LAST LIMIT 1`);
  const row=report.rows[0];
  return NextResponse.json({metrics,findings,latestReport:row?{id:row.id,title:row.title,status:row.status,executiveSummaryEs:row.executive_summary_es,executiveSummaryEn:row.executive_summary_en,recommendation:row.recommendation,metrics:row.metrics,findings:row.findings,risks:row.risks,publishedAt:row.published_at?new Date(row.published_at).toISOString():null,createdAt:new Date(row.created_at).toISOString(),updatedAt:new Date(row.updated_at).toISOString()}:null,updatedAt:new Date().toISOString()});
}
