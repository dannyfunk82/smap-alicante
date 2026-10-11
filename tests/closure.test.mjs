import test from "node:test";
import assert from "node:assert/strict";
import { actionPriorityScore, buildPilotFindings, decisionToActionStatus, pilotRecommendation, readinessScore } from "../lib/closure-policy.js";

test("small high-impact work ranks above large medium work",()=>{
  assert.ok(actionPriorityScore("high","high","small")>actionPriorityScore("medium","medium","large"));
});

test("readiness score rewards completed pilot activities",()=>{
  const score=readinessScore({onboardingCompletionRate:100,surveyResponseRate:80,averageRating:4.5,supportResolutionRate:90,checklistCompletionRate:100,activeUseRate:80,criticalOpenActions:0});
  assert.ok(score>=85);
});

test("critical open actions prevent an unconditional go recommendation",()=>{
  assert.equal(pilotRecommendation(88,1),"go_with_conditions");
  assert.equal(pilotRecommendation(88,0),"go");
});

test("decisions update action status and findings expose weak survey response",()=>{
  assert.equal(decisionToActionStatus("approve"),"approved");
  assert.equal(decisionToActionStatus("reject"),"rejected");
  const findings=buildPilotFindings({averageRating:4.2,surveyResponseRate:40,supportResolutionRate:90,criticalOpenActions:0});
  assert.ok(findings.some((item)=>item.code==="survey"&&item.tone==="warning"));
});
