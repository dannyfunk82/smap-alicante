import { db } from "@/lib/db";
import { continuityRecommendation, continuityScore, evaluateSlo, exerciseTimeliness } from "@/lib/continuity-policy.js";

const iso=(value:Date|string|null)=>value?new Date(value).toISOString():null;

type SloRow={metric_key:string;name_es:string;name_en:string;direction:"min"|"max";target_value:string|number;warning_value:string|number;unit:string;window_minutes:number;enabled:boolean;updated_at:Date|string;current_value:string|number|null;measured_at:Date|string|null;source:string|null};
type ShiftRow={id:string;role:string;contact_name:string;email:string;phone:string|null;starts_at:Date|string;ends_at:Date|string;status:string;notes:string;created_at:Date|string;updated_at:Date|string};
type ExerciseRow={id:string;exercise_type:string;title_es:string;title_en:string;status:string;scheduled_at:Date|string;completed_at:Date|string|null;result_es:string;result_en:string;evidence:string|null;created_at:Date|string;updated_at:Date|string};
type PostmortemRow={id:string;incident_id:string;incident_title_es:string;incident_title_en:string;incident_severity:string;incident_status:string;status:string;summary_es:string;summary_en:string;impact_es:string;impact_en:string;root_cause_es:string;root_cause_en:string;corrective_actions:unknown;owner:string|null;published_at:Date|string|null;created_at:Date|string;updated_at:Date|string};

export async function operationalContinuityState(){
  const [slosResult,shiftsResult,exercisesResult,postmortemsResult,incidentsResult,criticalResult,pendingPostmortemsResult]=await Promise.all([
    db.query(`SELECT s.*,m.value AS current_value,m.measured_at,m.source FROM operational_slos s LEFT JOIN LATERAL (SELECT value,measured_at,source FROM operational_measurements WHERE metric_key=s.metric_key ORDER BY measured_at DESC LIMIT 1) m ON TRUE ORDER BY s.metric_key`),
    db.query(`SELECT * FROM on_call_shifts WHERE ends_at>NOW()-INTERVAL '7 days' ORDER BY starts_at DESC LIMIT 50`),
    db.query(`SELECT * FROM continuity_exercises ORDER BY scheduled_at DESC LIMIT 50`),
    db.query(`SELECT p.*,i.title_es AS incident_title_es,i.title_en AS incident_title_en,i.severity AS incident_severity,i.status AS incident_status FROM incident_postmortems p JOIN service_incidents i ON i.id=p.incident_id ORDER BY p.updated_at DESC LIMIT 50`),
    db.query(`SELECT id,severity,status,title_es,title_en,starts_at,resolved_at FROM service_incidents ORDER BY starts_at DESC LIMIT 50`),
    db.query(`SELECT COUNT(*)::int AS count FROM service_incidents WHERE severity='critical' AND status<>'resolved'`),
    db.query(`SELECT COUNT(*)::int AS count FROM service_incidents i LEFT JOIN incident_postmortems p ON p.incident_id=i.id WHERE i.severity='critical' AND i.status='resolved' AND (p.id IS NULL OR p.status<>'published')`),
  ]);
  const now=new Date();
  const slos=(slosResult.rows as SloRow[]).map((row)=>{const current=row.current_value===null?null:Number(row.current_value);return {key:row.metric_key,nameEs:row.name_es,nameEn:row.name_en,direction:row.direction,target:Number(row.target_value),warning:Number(row.warning_value),unit:row.unit,windowMinutes:Number(row.window_minutes),enabled:row.enabled,current,measuredAt:iso(row.measured_at),source:row.source,status:evaluateSlo({direction:row.direction,target:Number(row.target_value),warning:Number(row.warning_value),current}),updatedAt:iso(row.updated_at)!};});
  const shifts=(shiftsResult.rows as ShiftRow[]).map((row)=>({id:row.id,role:row.role,contactName:row.contact_name,email:row.email,phone:row.phone,startsAt:iso(row.starts_at)!,endsAt:iso(row.ends_at)!,status:row.status,notes:row.notes,createdAt:iso(row.created_at)!,updatedAt:iso(row.updated_at)!}));
  const activeOnCall=shifts.some((row)=>row.status!=="cancelled"&&new Date(row.startsAt)<=now&&new Date(row.endsAt)>now);
  const exercises=(exercisesResult.rows as ExerciseRow[]).map((row)=>({id:row.id,type:row.exercise_type,titleEs:row.title_es,titleEn:row.title_en,status:row.status,timeliness:exerciseTimeliness({status:row.status,scheduledAt:row.scheduled_at,now}),scheduledAt:iso(row.scheduled_at)!,completedAt:iso(row.completed_at),resultEs:row.result_es,resultEn:row.result_en,evidence:row.evidence,createdAt:iso(row.created_at)!,updatedAt:iso(row.updated_at)!}));
  const postmortems=(postmortemsResult.rows as PostmortemRow[]).map((row)=>({id:row.id,incidentId:row.incident_id,incidentTitleEs:row.incident_title_es,incidentTitleEn:row.incident_title_en,incidentSeverity:row.incident_severity,incidentStatus:row.incident_status,status:row.status,summaryEs:row.summary_es,summaryEn:row.summary_en,impactEs:row.impact_es,impactEn:row.impact_en,rootCauseEs:row.root_cause_es,rootCauseEn:row.root_cause_en,correctiveActions:Array.isArray(row.corrective_actions)?row.corrective_actions:[],owner:row.owner,publishedAt:iso(row.published_at),createdAt:iso(row.created_at)!,updatedAt:iso(row.updated_at)!}));
  const incidents=incidentsResult.rows.map((row:{id:string;severity:string;status:string;title_es:string;title_en:string;starts_at:Date|string;resolved_at:Date|string|null})=>({id:row.id,severity:row.severity,status:row.status,titleEs:row.title_es,titleEn:row.title_en,startsAt:iso(row.starts_at)!,resolvedAt:iso(row.resolved_at)}));
  const criticalIncidents=Number(criticalResult.rows[0]?.count??0);
  const postmortemsPending=Number(pendingPostmortemsResult.rows[0]?.count??0);
  const score=continuityScore({sloStatuses:slos.filter((s)=>s.enabled).map((s)=>s.status),activeOnCall,criticalIncidents,failedExercises:exercises.filter((e)=>e.status==="failed").length,overdueExercises:exercises.filter((e)=>e.timeliness==="overdue").length,postmortemsPending});
  return {summary:{score,recommendation:continuityRecommendation(score,criticalIncidents),activeOnCall,criticalIncidents,postmortemsPending,sloOk:slos.filter((s)=>s.status==="ok").length,sloTotal:slos.filter((s)=>s.enabled).length,overdueExercises:exercises.filter((e)=>e.timeliness==="overdue").length},slos,shifts,exercises,postmortems,incidents};
}
