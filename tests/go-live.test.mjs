import test from "node:test";
import assert from "node:assert/strict";
import { approvalAllowsDeploy, calculateGoLiveReadiness, featureEnabled, retentionCutoff, rolloutBucket } from "../lib/go-live-policy.js";

test("feature rollout is deterministic and respects environment",()=>{
  assert.equal(rolloutBucket("user-1"),rolloutBucket("user-1"));
  assert.equal(featureEnabled({enabled:false,rolloutPercent:100,environments:["production"]},"user-1","production"),false);
  assert.equal(featureEnabled({enabled:true,rolloutPercent:100,environments:["production"]},"user-1","staging"),false);
  assert.equal(featureEnabled({enabled:true,rolloutPercent:100,environments:["production"]},"user-1","production"),true);
});

test("retention cutoff uses whole days",()=>{
  const cutoff=retentionCutoff(7,new Date("2026-07-25T12:00:00Z"));
  assert.equal(cutoff.toISOString(),"2026-07-18T12:00:00.000Z");
});

test("go-live readiness blocks missing required controls",()=>{
  const readiness=calculateGoLiveReadiness({checklist:[{key:"backup",required:true,completed:true},{key:"monitoring",required:true,completed:true},{key:"runbook",required:true,completed:true},{key:"https",required:true,completed:false}],checks:[{name:"database",status:"ok"}],criticalIncidents:0,releaseApproval:{decision:"conditional"}});
  assert.equal(readiness.recommendation,"ready_with_conditions");
  assert.ok(readiness.blockers.includes("checklist:https"));
  assert.equal(approvalAllowsDeploy("conditional"),true);
  assert.equal(approvalAllowsDeploy("rejected"),false);
});

test("critical incidents force not ready",()=>{
  const readiness=calculateGoLiveReadiness({checklist:[{key:"backup",required:true,completed:true}],checks:[{name:"database",status:"ok"}],criticalIncidents:1,releaseApproval:{decision:"approved"}});
  assert.equal(readiness.recommendation,"not_ready");
  assert.ok(readiness.blockers.includes("critical_incident"));
});
