import pg from "pg";
import fs from "node:fs";
import { deploymentReady } from "../lib/release-policy.js";
import { calculateGoLiveReadiness } from "../lib/go-live-policy.js";
import { deploymentProgress, releaseRisk, rollbackRecommendation } from "../lib/release-operations-policy.js";
import { continuityRecommendation, continuityScore, evaluateSlo, exerciseTimeliness } from "../lib/continuity-policy.js";

const environment = process.env.SMAP_ENVIRONMENT || "local";
const output = { version: "1.0.0", environment, checks: [], timestamp: new Date().toISOString() };
function add(name, status, details = {}) { output.checks.push({ name, status, details }); }

const nodeMajor = Number(process.versions.node.split(".")[0]);
add("node", nodeMajor >= 22 ? "ok" : "error", { version: process.versions.node, required: ">=22" });
add("auth_secret", (process.env.AUTH_SECRET?.length ?? 0) >= 32 ? "ok" : "error", { length: process.env.AUTH_SECRET?.length ?? 0 });
add("integration_key", (process.env.INTEGRATION_API_KEY?.length ?? 0) >= 16 ? "ok" : "error", { length: process.env.INTEGRATION_API_KEY?.length ?? 0 });
add("force_https", environment !== "production" || process.env.FORCE_HTTPS === "true" ? "ok" : "warning", { enabled: process.env.FORCE_HTTPS === "true" });
add("package_lock", fs.existsSync("package-lock.json") ? "ok" : "warning");

let database = "unavailable";
let goLive = { score: 0, recommendation: "not_ready", blockers: ["database"], checklistRate: 0, errorChecks: ["database"], warningChecks: [] };
if (process.env.DATABASE_URL) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const result = await client.query("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='runtime_settings') AND EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='pilot_final_reports') AND EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='feature_flags') AND EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='go_live_checklist') AND EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='release_plans') AND EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='operational_slos') AND EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='handover_checklist') AS migrated");
    database = result.rows[0]?.migrated ? "connected" : "migration_missing";
    add("database", database === "connected" ? "ok" : "error", { migrated: Boolean(result.rows[0]?.migrated) });
    if (database === "connected") {
      const [checklist, checks, incidents, approval] = await Promise.all([
        client.query("SELECT item_key,required,completed FROM go_live_checklist"),
        client.query("SELECT DISTINCT ON(check_name) check_name,status FROM system_checks ORDER BY check_name,checked_at DESC"),
        client.query("SELECT COUNT(*)::int AS count FROM service_incidents WHERE status<>'resolved' AND severity='critical'"),
        client.query("SELECT decision FROM release_approvals WHERE release_version='1.0.0' AND environment='production' ORDER BY decided_at DESC LIMIT 1"),
      ]);
      goLive = calculateGoLiveReadiness({ checklist: checklist.rows.map((row) => ({ key: row.item_key, required: row.required, completed: row.completed })), checks: checks.rows.map((row) => ({ name: row.check_name, status: row.status })), criticalIncidents: Number(incidents.rows[0]?.count ?? 0), releaseApproval: approval.rows[0] ?? null });
      add("go_live", goLive.recommendation === "not_ready" ? "warning" : "ok", goLive);
      const releasePlanResult = await client.query("SELECT * FROM release_plans ORDER BY created_at DESC LIMIT 1");
      if (releasePlanResult.rows[0]) {
        const plan = releasePlanResult.rows[0];
        const [releaseSteps,releaseObservations] = await Promise.all([client.query("SELECT required,status FROM release_steps WHERE plan_id=$1",[plan.id]),client.query("SELECT status FROM release_health_observations WHERE plan_id=$1",[plan.id])]);
        const releaseState={deploymentId:plan.deployment_id,status:plan.status,rolloutPercent:Number(plan.rollout_percent),progress:deploymentProgress(releaseSteps.rows),risk:releaseRisk({steps:releaseSteps.rows,observations:releaseObservations.rows}),rollbackRecommendation:rollbackRecommendation({steps:releaseSteps.rows,observations:releaseObservations.rows})};
        add("release_operations", releaseState.risk === "critical" ? "error" : releaseState.risk === "high" ? "warning" : "ok", releaseState);
        output.release = releaseState;
      } else add("release_operations","warning",{message:"No release plan"});
      const [sloRows,shiftRows,exerciseRows,pendingPostmortems] = await Promise.all([
        client.query(`SELECT s.direction,s.target_value,s.warning_value,m.value FROM operational_slos s LEFT JOIN LATERAL (SELECT value FROM operational_measurements WHERE metric_key=s.metric_key ORDER BY measured_at DESC LIMIT 1) m ON TRUE WHERE s.enabled=TRUE`),
        client.query(`SELECT COUNT(*)::int AS count FROM on_call_shifts WHERE status<>'cancelled' AND starts_at<=NOW() AND ends_at>NOW()`),
        client.query(`SELECT status,scheduled_at FROM continuity_exercises WHERE status NOT IN ('completed','cancelled') OR status='failed'`),
        client.query(`SELECT COUNT(*)::int AS count FROM service_incidents i LEFT JOIN incident_postmortems p ON p.incident_id=i.id WHERE i.severity='critical' AND i.status='resolved' AND (p.id IS NULL OR p.status<>'published')`),
      ]);
      const sloStatuses=sloRows.rows.map((row)=>evaluateSlo({direction:row.direction,target:Number(row.target_value),warning:Number(row.warning_value),current:row.value===null?null:Number(row.value)}));
      const exerciseStates=exerciseRows.rows.map((row)=>({status:row.status,timeliness:exerciseTimeliness({status:row.status,scheduledAt:row.scheduled_at})}));
      const continuity={score:continuityScore({sloStatuses,activeOnCall:Number(shiftRows.rows[0]?.count??0)>0,criticalIncidents:Number(incidents.rows[0]?.count??0),failedExercises:exerciseStates.filter((item)=>item.status==='failed').length,overdueExercises:exerciseStates.filter((item)=>item.timeliness==='overdue').length,postmortemsPending:Number(pendingPostmortems.rows[0]?.count??0)})};
      continuity.recommendation=continuityRecommendation(continuity.score,Number(incidents.rows[0]?.count??0));
      add("operational_continuity",continuity.recommendation==='at_risk'?"warning":"ok",continuity);
      output.continuity=continuity;
      const [handoverItems,handoverDocuments] = await Promise.all([
        client.query("SELECT required,completed FROM handover_checklist"),
        client.query("SELECT status FROM handover_documents"),
      ]);
      const required = handoverItems.rows.filter((row)=>row.required);
      const checklistRate = required.length ? Math.round(required.filter((row)=>row.completed).length / required.length * 100) : 100;
      const documentRate = handoverDocuments.rows.length ? Math.round(handoverDocuments.rows.filter((row)=>row.status==='approved').length / handoverDocuments.rows.length * 100) : 0;
      const handover={checklistRate,documentRate,ready:checklistRate>=90&&documentRate>=85};
      add("handover",handover.ready?"ok":"warning",handover);
      output.handover=handover;
    }
  } catch (error) { add("database", "error", { error: error instanceof Error ? error.message : String(error) }); }
  finally { await client.end().catch(() => undefined); }
} else add("database", "error", { error: "DATABASE_URL missing" });

const readiness = deploymentReady({ database, environment, authSecretLength: process.env.AUTH_SECRET?.length ?? 0, integrationKeyLength: process.env.INTEGRATION_API_KEY?.length ?? 0, forceHttps: process.env.FORCE_HTTPS === "true" });
output.goLive = goLive;
output.ready = readiness.ready && (environment !== "production" || goLive.recommendation !== "not_ready");
output.failures = [...readiness.failures, ...(environment === "production" && goLive.recommendation === "not_ready" ? ["go_live"] : [])];
output.warnings = readiness.warnings;
console.log(JSON.stringify(output, null, 2));
if (!output.ready) process.exitCode = 1;
