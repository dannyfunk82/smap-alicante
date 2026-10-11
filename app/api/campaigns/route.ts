import { NextResponse } from "next/server";
import { currentApiSession } from "@/lib/api-session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
type Row = Record<string, any>;

export async function GET(request:Request){
  const session=await currentApiSession();
  if(!session)return NextResponse.json({error:"Unauthorized"},{status:401});
  const locale=new URL(request.url).searchParams.get("lang")==="en"?"en":"es";
  const membership=await db.query(`SELECT pc.id,pc.code,pc.name FROM pilot_memberships pm JOIN pilot_cohorts pc ON pc.id=pm.cohort_id WHERE pm.user_id=$1 AND pm.status='active'`,[session.sub]);
  const cohortId=membership.rows[0]?.id??null;
  const campaigns=await db.query(`SELECT pc.id,pc.code,pc.title_es,pc.title_en,pc.description_es,pc.description_en,pc.status,pc.starts_at,pc.ends_at,c.code AS cohort_code
    FROM pilot_campaigns pc LEFT JOIN pilot_cohorts c ON c.id=pc.cohort_id
    WHERE pc.status<>'cancelled' AND (pc.cohort_id IS NULL OR pc.cohort_id=$1::uuid)
    ORDER BY CASE pc.status WHEN 'active' THEN 0 WHEN 'planned' THEN 1 ELSE 2 END,COALESCE(pc.starts_at,pc.created_at) DESC`,[cohortId]);
  if(!campaigns.rowCount)return NextResponse.json({membership:membership.rows[0]?{cohortCode:membership.rows[0].code,cohortName:membership.rows[0].name}:null,campaigns:[]});
  const campaignIds=campaigns.rows.map((row:Row)=>row.id);
  const surveys=await db.query(`SELECT ps.id,ps.campaign_id,ps.code,ps.title_es,ps.title_en,ps.description_es,ps.description_en,ps.status,ps.anonymous,ps.opens_at,ps.closes_at,pr.submitted_at
    FROM pilot_surveys ps LEFT JOIN pilot_survey_responses pr ON pr.survey_id=ps.id AND pr.user_id=$2
    WHERE ps.campaign_id=ANY($1::uuid[]) AND ps.status<>'draft'
    ORDER BY ps.created_at DESC`,[campaignIds,session.sub]);
  const surveyIds=surveys.rows.map((row:Row)=>row.id);
  const questions=surveyIds.length?await db.query(`SELECT id,survey_id,position,question_type,prompt_es,prompt_en,required,options FROM pilot_survey_questions WHERE survey_id=ANY($1::uuid[]) ORDER BY survey_id,position`,[surveyIds]):{rows:[]};
  const questionMap=new Map<string,Row[]>();
  for(const question of questions.rows as Row[]){const list=questionMap.get(question.survey_id)??[];list.push(question);questionMap.set(question.survey_id,list);}
  const surveyMap=new Map<string,Row[]>();
  for(const survey of surveys.rows as Row[]){const list=surveyMap.get(survey.campaign_id)??[];list.push(survey);surveyMap.set(survey.campaign_id,list);}
  return NextResponse.json({
    membership:membership.rows[0]?{cohortCode:membership.rows[0].code,cohortName:membership.rows[0].name}:null,
    campaigns:campaigns.rows.map((campaign:Row)=>({
      id:campaign.id,code:campaign.code,title:locale==="en"?campaign.title_en:campaign.title_es,description:locale==="en"?campaign.description_en:campaign.description_es,status:campaign.status,
      startsAt:campaign.starts_at?new Date(campaign.starts_at).toISOString():null,endsAt:campaign.ends_at?new Date(campaign.ends_at).toISOString():null,cohortCode:campaign.cohort_code,
      surveys:(surveyMap.get(campaign.id)??[]).map((survey:Row)=>({
        id:survey.id,code:survey.code,title:locale==="en"?survey.title_en:survey.title_es,description:locale==="en"?survey.description_en:survey.description_es,status:survey.status,anonymous:Boolean(survey.anonymous),
        opensAt:survey.opens_at?new Date(survey.opens_at).toISOString():null,closesAt:survey.closes_at?new Date(survey.closes_at).toISOString():null,submitted:Boolean(survey.submitted_at),submittedAt:survey.submitted_at?new Date(survey.submitted_at).toISOString():null,
        questions:(questionMap.get(survey.id)??[]).map((q:Row)=>({id:q.id,position:Number(q.position),type:q.question_type,prompt:locale==="en"?q.prompt_en:q.prompt_es,required:Boolean(q.required),options:Array.isArray(q.options)?q.options:[]})),
      })),
    })),
  });
}
