import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { APP_ENVIRONMENT, APP_VERSION } from "@/lib/system";
import { calculateGoLiveReadiness } from "@/lib/go-live-policy.js";

export const dynamic = "force-dynamic";

type FlagRow={flag_key:string;description_es:string;description_en:string;enabled:boolean;rollout_percent:number;environments:string[];updated_at:Date|string};
type RetentionRow={policy_key:string;table_name:string;timestamp_column:string;retention_days:number;enabled:boolean;last_run_at:Date|string|null;last_deleted_rows:number;updated_at:Date|string};
type ContactRow={id:string;contact_role:string;name:string;email:string;phone:string|null;escalation_level:number;active:boolean;created_at:Date|string;updated_at:Date|string};
type ChecklistRow={item_key:string;title_es:string;title_en:string;category:string;required:boolean;completed:boolean;evidence:string|null;completed_at:Date|string|null;updated_at:Date|string};
type ApprovalRow={id:string;release_version:string;environment:"staging"|"production";decision:"approved"|"conditional"|"rejected";approver_name:string;approver_email:string|null;notes:string;decided_at:Date|string};
type SnapshotRow={id:string;release_version:string;environment:string;readiness_score:number;recommendation:"ready"|"ready_with_conditions"|"not_ready";blockers:string[];details:Record<string,unknown>;created_at:Date|string};
type CheckRow={check_name:string;status:"ok"|"warning"|"error";checked_at:Date|string};

export async function GET(){
  if(!await currentAdminSession()) return NextResponse.json({error:"Forbidden"},{status:403});
  const [flags,retention,contacts,checklist,approvals,snapshots,checks,incidents]=await Promise.all([
    db.query("SELECT * FROM feature_flags ORDER BY flag_key"),
    db.query("SELECT * FROM data_retention_policies ORDER BY policy_key"),
    db.query("SELECT * FROM operational_contacts ORDER BY active DESC,escalation_level,contact_role"),
    db.query("SELECT * FROM go_live_checklist ORDER BY required DESC,category,item_key"),
    db.query("SELECT * FROM release_approvals ORDER BY decided_at DESC LIMIT 30"),
    db.query("SELECT * FROM go_live_snapshots ORDER BY created_at DESC LIMIT 20"),
    db.query("SELECT DISTINCT ON(check_name) check_name,status,checked_at FROM system_checks ORDER BY check_name,checked_at DESC"),
    db.query("SELECT COUNT(*)::int AS count FROM service_incidents WHERE status<>'resolved' AND severity='critical'"),
  ]);
  const checklistRows=checklist.rows as ChecklistRow[];
  const checkRows=checks.rows as CheckRow[];
  const approvalRows=approvals.rows as ApprovalRow[];
  const latestApproval=approvalRows.find((row)=>row.release_version===APP_VERSION&&row.environment==="production")??null;
  const readiness=calculateGoLiveReadiness({
    checklist:checklistRows.map((row)=>({key:row.item_key,required:row.required,completed:row.completed})),
    checks:checkRows.map((row)=>({name:row.check_name,status:row.status})),
    criticalIncidents:Number(incidents.rows[0]?.count??0),releaseApproval:latestApproval,
  });
  return NextResponse.json({
    releaseVersion:APP_VERSION,environment:APP_ENVIRONMENT,readiness,
    featureFlags:(flags.rows as FlagRow[]).map((row)=>({key:row.flag_key,descriptionEs:row.description_es,descriptionEn:row.description_en,enabled:row.enabled,rolloutPercent:Number(row.rollout_percent),environments:row.environments??[],updatedAt:new Date(row.updated_at).toISOString()})),
    retentionPolicies:(retention.rows as RetentionRow[]).map((row)=>({key:row.policy_key,tableName:row.table_name,timestampColumn:row.timestamp_column,retentionDays:Number(row.retention_days),enabled:row.enabled,lastRunAt:row.last_run_at?new Date(row.last_run_at).toISOString():null,lastDeletedRows:Number(row.last_deleted_rows),updatedAt:new Date(row.updated_at).toISOString()})),
    contacts:(contacts.rows as ContactRow[]).map((row)=>({id:row.id,role:row.contact_role,name:row.name,email:row.email,phone:row.phone,escalationLevel:Number(row.escalation_level),active:row.active,createdAt:new Date(row.created_at).toISOString(),updatedAt:new Date(row.updated_at).toISOString()})),
    checklist:checklistRows.map((row)=>({key:row.item_key,titleEs:row.title_es,titleEn:row.title_en,category:row.category,required:row.required,completed:row.completed,evidence:row.evidence,completedAt:row.completed_at?new Date(row.completed_at).toISOString():null,updatedAt:new Date(row.updated_at).toISOString()})),
    approvals:approvalRows.map((row)=>({id:row.id,releaseVersion:row.release_version,environment:row.environment,decision:row.decision,approverName:row.approver_name,approverEmail:row.approver_email,notes:row.notes,decidedAt:new Date(row.decided_at).toISOString()})),
    snapshots:(snapshots.rows as SnapshotRow[]).map((row)=>({id:row.id,releaseVersion:row.release_version,environment:row.environment,readinessScore:Number(row.readiness_score),recommendation:row.recommendation,blockers:row.blockers??[],details:row.details??{},createdAt:new Date(row.created_at).toISOString()})),
    checks:checkRows.map((row)=>({name:row.check_name,status:row.status,checkedAt:new Date(row.checked_at).toISOString()})),criticalIncidents:Number(incidents.rows[0]?.count??0),
  });
}
