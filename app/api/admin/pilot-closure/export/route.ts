import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { collectPilotClosureMetrics, pilotClosureFindings, reportSummary } from "@/lib/pilot-closure";

export async function GET(){
  if(!await currentAdminSession())return new Response("Forbidden",{status:403});
  const metrics=await collectPilotClosureMetrics();const findings=pilotClosureFindings(metrics);const actions=await db.query(`SELECT title_es,priority,impact,effort,status,owner,target_date FROM pilot_improvement_actions ORDER BY updated_at DESC`);
  const lines=["# SMAP Pilot Closure Report","",reportSummary(metrics,"en"),"","## Key metrics",`- Readiness: ${metrics.readinessScore}%`,`- Recommendation: ${metrics.recommendation}`,`- Participants: ${metrics.participants}`,`- Survey response: ${metrics.surveyResponseRate}%`,`- Average rating: ${metrics.averageRating}/5`,`- Support resolution: ${metrics.supportResolutionRate}%`,"","## Findings",...findings.map((item)=>`- ${item.en}`),"","## Improvement actions",...actions.rows.map((row:{title_es:string;priority:string;impact:string;effort:string;status:string;owner:string|null;target_date:Date|string|null})=>`- [${row.status}] ${row.title_es} — ${row.priority}/${row.impact}/${row.effort}${row.owner?` — ${row.owner}`:""}${row.target_date?` — ${new Date(row.target_date).toISOString().slice(0,10)}`:""}`),""];
  return new Response(lines.join("\n"),{headers:{"Content-Type":"text/markdown; charset=utf-8","Content-Disposition":"attachment; filename=SMAP-pilot-closure-report.md"}});
}
