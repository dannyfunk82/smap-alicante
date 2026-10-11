import { NextResponse } from "next/server";
import { currentApiSession } from "@/lib/api-session";
import { db } from "@/lib/db";
import { validateSurveyAnswer } from "@/lib/campaign-policy.js";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";
import { trackAnalyticsEvent } from "@/lib/analytics";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const session=await currentApiSession();
  if(!session)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params;
  const body=await request.json().catch(()=>null) as {answers?:Record<string,unknown>}|null;
  if(!body?.answers||typeof body.answers!=="object")return NextResponse.json({error:"Answers required"},{status:400});
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const survey=await client.query(`SELECT ps.id,ps.status,ps.opens_at,ps.closes_at,pc.cohort_id
      FROM pilot_surveys ps JOIN pilot_campaigns pc ON pc.id=ps.campaign_id
      WHERE ps.id=$1 FOR UPDATE`,[id]);
    if(!survey.rowCount){await client.query("ROLLBACK");return NextResponse.json({error:"Survey not found"},{status:404});}
    const s=survey.rows[0];
    const now=Date.now();
    if(s.status!=="active"||(s.opens_at&&new Date(s.opens_at).getTime()>now)||(s.closes_at&&new Date(s.closes_at).getTime()<now)){
      await client.query("ROLLBACK");return NextResponse.json({error:"Survey is not active"},{status:409});
    }
    if(s.cohort_id){
      const membership=await client.query(`SELECT 1 FROM pilot_memberships WHERE user_id=$1 AND cohort_id=$2 AND status='active'`,[session.sub,s.cohort_id]);
      if(!membership.rowCount){await client.query("ROLLBACK");return NextResponse.json({error:"Not eligible"},{status:403});}
    }
    const existing=await client.query(`SELECT submitted_at FROM pilot_survey_responses WHERE survey_id=$1 AND user_id=$2`,[id,session.sub]);
    if(existing.rows[0]?.submitted_at){await client.query("ROLLBACK");return NextResponse.json({error:"Survey already submitted"},{status:409});}
    const questions=await client.query(`SELECT id,question_type,required,options FROM pilot_survey_questions WHERE survey_id=$1 ORDER BY position`,[id]);
    const invalid=questions.rows.find((q:Record<string,any>)=>!validateSurveyAnswer({type:q.question_type,required:Boolean(q.required),options:Array.isArray(q.options)?q.options:[]},body.answers?.[q.id]));
    if(invalid){await client.query("ROLLBACK");return NextResponse.json({error:"Invalid or missing answer",questionId:invalid.id},{status:400});}
    const response=await client.query(`INSERT INTO pilot_survey_responses(survey_id,user_id,submitted_at) VALUES($1,$2,NOW())
      ON CONFLICT(survey_id,user_id) DO UPDATE SET submitted_at=NOW() RETURNING id,submitted_at`,[id,session.sub]);
    for(const q of questions.rows as Array<Record<string,any>>){
      const value=body.answers[q.id];
      await client.query(`INSERT INTO pilot_survey_answers(response_id,question_id,answer) VALUES($1,$2,$3::jsonb)
        ON CONFLICT(response_id,question_id) DO UPDATE SET answer=EXCLUDED.answer,created_at=NOW()`,[response.rows[0].id,q.id,JSON.stringify(value)]);
    }
    await client.query(`INSERT INTO notifications(user_id,type,title_es,title_en,body_es,body_en) VALUES($1,'survey','Encuesta enviada','Survey submitted','Gracias por participar en la campaña piloto.','Thank you for taking part in the pilot campaign.')`,[session.sub]);
    await client.query("COMMIT");
    await recordAudit({actorUserId:session.sub,actorEmail:session.email,action:"pilot.survey_submitted",entityType:"pilot_survey",entityId:id,ipAddress:requestIp(request),details:{answerCount:questions.rowCount}});
    await trackAnalyticsEvent({userId:session.sub,eventName:"survey_submitted",section:"campaigns",properties:{surveyId:id}});
    return NextResponse.json({ok:true,submittedAt:new Date(response.rows[0].submitted_at).toISOString()});
  }catch(error){await client.query("ROLLBACK").catch(()=>undefined);throw error;}finally{client.release();}
}
