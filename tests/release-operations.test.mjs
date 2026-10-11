import test from "node:test";
import assert from "node:assert/strict";
import { canPromoteRelease, deploymentProgress, nextRolloutPercent, releaseRisk, rollbackRecommendation } from "../lib/release-operations-policy.js";

test("deployment progress counts required completed steps",()=>{
  assert.equal(deploymentProgress([{required:true,status:"completed"},{required:true,status:"pending"},{required:false,status:"pending"}]),50);
  assert.equal(deploymentProgress([]),0);
});

test("release risk escalates on errors and failed required steps",()=>{
  assert.equal(releaseRisk({steps:[{required:true,status:"failed"}],observations:[]}),"critical");
  assert.equal(releaseRisk({steps:[],observations:[{status:"warning"}]}),"medium");
  assert.equal(releaseRisk({steps:[],observations:[]}),"low");
});

test("promotion requires completed steps, readiness and approval",()=>{
  const input={plan:{status:"in_progress"},steps:[{required:true,status:"completed"}],goLiveRecommendation:"ready_with_conditions",approvalDecision:"conditional",criticalIncidents:0};
  assert.equal(canPromoteRelease(input),true);
  assert.equal(canPromoteRelease({...input,steps:[{required:true,status:"pending"}]}),false);
  assert.equal(canPromoteRelease({...input,criticalIncidents:1}),false);
});

test("rollback recommendation and rollout ladder are conservative",()=>{
  assert.equal(rollbackRecommendation({observations:[{status:"error"},{status:"error"}]}),"rollback");
  assert.equal(rollbackRecommendation({observations:[{status:"warning"}]}),"hold");
  assert.equal(nextRolloutPercent(10,"ok"),25);
  assert.equal(nextRolloutPercent(50,"ok"),100);
  assert.equal(nextRolloutPercent(50,"error"),25);
});
