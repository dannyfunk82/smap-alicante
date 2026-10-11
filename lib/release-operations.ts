import { db } from "@/lib/db";
import { deploymentProgress, releaseRisk, rollbackRecommendation } from "@/lib/release-operations-policy.js";

export type ReleasePlanRow={id:string;release_version:string;deployment_id:string;environment:"local"|"staging"|"production";strategy:"all_at_once"|"canary"|"blue_green";status:string;rollout_percent:number;scheduled_at:Date|string|null;started_at:Date|string|null;completed_at:Date|string|null;owner:string|null;notes:string;created_at:Date|string;updated_at:Date|string};
export type ReleaseStepRow={id:number;plan_id:string;step_key:string;title_es:string;title_en:string;sequence:number;required:boolean;status:string;evidence:string|null;started_at:Date|string|null;completed_at:Date|string|null;updated_at:Date|string};
export type ReleaseObservationRow={id:string;plan_id:string;observation_type:string;status:"ok"|"warning"|"error";title:string;details:Record<string,unknown>;observed_at:Date|string};
export type RollbackPointRow={id:string;plan_id:string;label:string;backup_reference:string|null;deployment_reference:string|null;status:string;created_at:Date|string;used_at:Date|string|null};
export type RollbackRow={id:string;plan_id:string;rollback_point_id:string|null;reason:string;status:string;notes:string;requested_at:Date|string;executed_at:Date|string|null};

const iso=(value:Date|string|null)=>value?new Date(value).toISOString():null;

export async function releaseOperationsState(){
  const [plansResult,stepsResult,observationsResult,pointsResult,rollbacksResult,incidentsResult,goLiveResult,approvalResult]=await Promise.all([
    db.query("SELECT * FROM release_plans ORDER BY created_at DESC LIMIT 30"),
    db.query("SELECT * FROM release_steps ORDER BY plan_id,sequence"),
    db.query("SELECT * FROM release_health_observations ORDER BY observed_at DESC LIMIT 200"),
    db.query("SELECT * FROM release_rollback_points ORDER BY created_at DESC LIMIT 100"),
    db.query("SELECT * FROM release_rollbacks ORDER BY requested_at DESC LIMIT 100"),
    db.query("SELECT COUNT(*)::int AS count FROM service_incidents WHERE status<>'resolved' AND severity='critical'"),
    db.query("SELECT recommendation,readiness_score FROM go_live_snapshots ORDER BY created_at DESC LIMIT 1"),
    db.query("SELECT decision FROM release_approvals WHERE environment='production' ORDER BY decided_at DESC LIMIT 1"),
  ]);
  const steps=stepsResult.rows as ReleaseStepRow[];
  const observations=observationsResult.rows as ReleaseObservationRow[];
  const points=pointsResult.rows as RollbackPointRow[];
  const rollbacks=rollbacksResult.rows as RollbackRow[];
  const criticalIncidents=Number(incidentsResult.rows[0]?.count??0);
  const plans=(plansResult.rows as ReleasePlanRow[]).map((row)=>{
    const planSteps=steps.filter((step)=>step.plan_id===row.id);
    const planObservations=observations.filter((item)=>item.plan_id===row.id);
    return {
      id:row.id,releaseVersion:row.release_version,deploymentId:row.deployment_id,environment:row.environment,strategy:row.strategy,status:row.status,rolloutPercent:Number(row.rollout_percent),scheduledAt:iso(row.scheduled_at),startedAt:iso(row.started_at),completedAt:iso(row.completed_at),owner:row.owner,notes:row.notes,createdAt:iso(row.created_at)!,updatedAt:iso(row.updated_at)!,
      progress:deploymentProgress(planSteps),risk:releaseRisk({steps:planSteps,observations:planObservations,criticalIncidents}),rollbackRecommendation:rollbackRecommendation({steps:planSteps,observations:planObservations,criticalIncidents}),
      steps:planSteps.map((step)=>({id:Number(step.id),key:step.step_key,titleEs:step.title_es,titleEn:step.title_en,sequence:Number(step.sequence),required:step.required,status:step.status,evidence:step.evidence,startedAt:iso(step.started_at),completedAt:iso(step.completed_at),updatedAt:iso(step.updated_at)!})),
      observations:planObservations.map((item)=>({id:item.id,type:item.observation_type,status:item.status,title:item.title,details:item.details??{},observedAt:iso(item.observed_at)!})),
      rollbackPoints:points.filter((item)=>item.plan_id===row.id).map((item)=>({id:item.id,label:item.label,backupReference:item.backup_reference,deploymentReference:item.deployment_reference,status:item.status,createdAt:iso(item.created_at)!,usedAt:iso(item.used_at)})),
      rollbacks:rollbacks.filter((item)=>item.plan_id===row.id).map((item)=>({id:item.id,rollbackPointId:item.rollback_point_id,reason:item.reason,status:item.status,notes:item.notes,requestedAt:iso(item.requested_at)!,executedAt:iso(item.executed_at)})),
    };
  });
  return {summary:{total:plans.length,inProgress:plans.filter((item)=>item.status==="in_progress").length,completed:plans.filter((item)=>item.status==="completed").length,failed:plans.filter((item)=>item.status==="failed"||item.status==="rolled_back").length,criticalIncidents,goLiveRecommendation:goLiveResult.rows[0]?.recommendation??"not_ready",goLiveScore:Number(goLiveResult.rows[0]?.readiness_score??0),approvalDecision:approvalResult.rows[0]?.decision??null},plans};
}
