import test from "node:test";
import assert from "node:assert/strict";
import { inviteAvailable, onboardingPercentage, supportPriority } from "../lib/pilot-operations-policy.js";

test("onboarding progress is calculated from completed steps",()=>{
  assert.equal(onboardingPercentage({a:true,b:false,c:true,d:true}),75);
  assert.equal(onboardingPercentage({}),0);
});
test("support priority escalates account and accessibility requests",()=>{
  assert.equal(supportPriority("accessibility"),"high");
  assert.equal(supportPriority("account"),"high");
  assert.equal(supportPriority("technical"),"normal");
});
test("pilot invites respect status, capacity and expiry",()=>{
  const now=new Date("2026-07-24T12:00:00Z");
  assert.equal(inviteAvailable({status:"active",usedCount:0,maxUses:1,expiresAt:"2026-07-25T00:00:00Z"},now),true);
  assert.equal(inviteAvailable({status:"exhausted",usedCount:1,maxUses:1,expiresAt:null},now),false);
  assert.equal(inviteAvailable({status:"active",usedCount:0,maxUses:1,expiresAt:"2026-07-23T00:00:00Z"},now),false);
});
