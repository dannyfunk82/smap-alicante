import test from "node:test";
import assert from "node:assert/strict";
import { acceptanceRecommendation, acceptanceScore, checklistRate, documentRate } from "../lib/handover-policy.js";

test("checklist rate uses required items",()=>assert.equal(checklistRate([{required:true,completed:true},{required:true,completed:false},{required:false,completed:false}]),50));
test("document rate counts approved documents",()=>assert.equal(documentRate([{status:"approved"},{status:"reviewed"},{status:"approved"}]),67));
test("acceptance score penalises critical errors",()=>assert.equal(acceptanceScore({checklist:[{completed:true}],documents:[{status:"approved"}],criticalChecks:[{status:"error"}]}),80));
test("recommendation thresholds",()=>{assert.equal(acceptanceRecommendation(95,0),"passed");assert.equal(acceptanceRecommendation(85,0),"conditional");assert.equal(acceptanceRecommendation(95,1),"failed");});
