import test from "node:test";
import assert from "node:assert/strict";
import { campaignIsActive, surveyCompletionRate, validateSurveyAnswer } from "../lib/campaign-policy.js";

test("campaign windows respect status and dates",()=>{
  const now=new Date("2026-07-25T12:00:00Z");
  assert.equal(campaignIsActive({status:"active",startsAt:"2026-07-24T00:00:00Z",endsAt:"2026-07-26T00:00:00Z"},now),true);
  assert.equal(campaignIsActive({status:"planned",startsAt:null,endsAt:null},now),false);
  assert.equal(campaignIsActive({status:"active",startsAt:"2026-07-26T00:00:00Z",endsAt:null},now),false);
});

test("survey answers are validated by question type",()=>{
  assert.equal(validateSurveyAnswer({type:"rating",required:true,options:[]},5),true);
  assert.equal(validateSurveyAnswer({type:"rating",required:true,options:[]},7),false);
  assert.equal(validateSurveyAnswer({type:"single",required:true,options:["A","B"]},"B"),true);
  assert.equal(validateSurveyAnswer({type:"single",required:true,options:["A","B"]},"C"),false);
  assert.equal(validateSurveyAnswer({type:"text",required:false,options:[]},""),true);
});

test("survey completion rate is bounded",()=>{
  assert.equal(surveyCompletionRate(5,10),50);
  assert.equal(surveyCompletionRate(3,0),0);
  assert.equal(surveyCompletionRate(12,10),100);
});
