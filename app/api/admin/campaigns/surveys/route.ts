import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

export async function POST(request:Request){
  const session=await currentAdminSession();if(!session)return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await request.json().catch(()=>null) as {campaignId?:string;code?:string;titleEs?:string;titleEn?:string;descriptionEs?:string;descriptionEn?:string;closesAt?:string|null}|null;
  const code=String(body?.code??"").trim().toUpperCase().replace(/[^A-Z0-9_-]/g,"-").slice(0,40);
  if(!body?.campaignId||code.length<3||!String(body.titleEs??"").trim()||!String(body.titleEn??"").trim())return NextResponse.json({error:"Campaign, code and titles required"},{status:400});
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const survey=await client.query(`INSERT INTO pilot_surveys(campaign_id,code,title_es,title_en,description_es,description_en,status,opens_at,closes_at,created_by)
      VALUES($1,$2,$3,$4,$5,$6,'active',NOW(),$7,$8) RETURNING id`,[body.campaignId,code,String(body.titleEs).trim().slice(0,180),String(body.titleEn).trim().slice(0,180),String(body.descriptionEs??"").trim().slice(0,2000),String(body.descriptionEn??"").trim().slice(0,2000),body.closesAt||null,session.sub]);
    const questions=[
      [1,"rating","Valora tu experiencia general con SMAP","Rate your overall experience with SMAP",true,[]],
      [2,"single","¿Qué función te ha resultado más útil?","Which feature was most useful?",true,["Mapa / Map","Llegadas / Arrivals","Billetes / Tickets","Accesibilidad / Accessibility"]],
      [3,"single","¿Recomendarías SMAP a otra persona?","Would you recommend SMAP to someone else?",true,["Sí / Yes","Tal vez / Maybe","No"]],
      [4,"text","¿Qué deberíamos mejorar antes del lanzamiento?","What should we improve before launch?",false,[]],
    ];
    for(const [position,type,promptEs,promptEn,required,options] of questions){await client.query(`INSERT INTO pilot_survey_questions(survey_id,position,question_type,prompt_es,prompt_en,required,options) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,[survey.rows[0].id,position,type,promptEs,promptEn,required,JSON.stringify(options)]);}
    await client.query("COMMIT");
    await recordAudit({actorUserId:session.sub,actorEmail:session.email,action:"pilot.survey_created",entityType:"pilot_survey",entityId:survey.rows[0].id,ipAddress:requestIp(request),details:{code}});
    return NextResponse.json({ok:true,id:survey.rows[0].id},{status:201});
  }catch(error){await client.query("ROLLBACK").catch(()=>undefined);throw error;}finally{client.release();}
}
