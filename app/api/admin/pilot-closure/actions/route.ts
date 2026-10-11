import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

const categories=["ux","accessibility","data","ticketing","operations","security","integration"];
const priorities=["low","medium","high","critical"];
const impacts=["low","medium","high"];
const efforts=["small","medium","large"];
const statuses=["proposed","approved","in_progress","completed","rejected"];
const sourceTypes=["feedback","survey","support","analytics","manual"];

export async function POST(request:Request){
  const session=await currentAdminSession();if(!session)return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  if(!body||String(body.titleEs||"").trim().length<3||String(body.titleEn||"").trim().length<3)return NextResponse.json({error:"Titles are required"},{status:400});
  if(!categories.includes(String(body.category))||!priorities.includes(String(body.priority))||!impacts.includes(String(body.impact))||!efforts.includes(String(body.effort))||!sourceTypes.includes(String(body.sourceType||"manual")))return NextResponse.json({error:"Invalid action classification"},{status:400});
  const result=await db.query(`INSERT INTO pilot_improvement_actions(cohort_id,title_es,title_en,description_es,description_en,category,priority,impact,effort,owner,target_date,source_type,source_reference,created_by)
    VALUES(NULLIF($1,'')::uuid,$2,$3,$4,$5,$6,$7,$8,$9,NULLIF($10,''),NULLIF($11,'')::date,$12,NULLIF($13,''),$14) RETURNING id`,[
      String(body.cohortId||""),String(body.titleEs).trim(),String(body.titleEn).trim(),String(body.descriptionEs||"").trim(),String(body.descriptionEn||"").trim(),body.category,body.priority,body.impact,body.effort,String(body.owner||"").trim(),String(body.targetDate||""),String(body.sourceType||"manual"),String(body.sourceReference||"").trim(),session.sub]);
  await recordAudit({actorUserId:session.sub,actorEmail:session.email,action:"pilot.action_created",entityType:"pilot_improvement_action",entityId:result.rows[0].id,ipAddress:requestIp(request),details:{priority:body.priority,category:body.category}});
  return NextResponse.json({ok:true,id:result.rows[0].id},{status:201});
}

export async function PATCH(request:Request){
  const session=await currentAdminSession();if(!session)return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await request.json().catch(()=>null) as {id?:string;status?:string;owner?:string;targetDate?:string|null}|null;
  if(!body?.id||!body.status||!statuses.includes(body.status))return NextResponse.json({error:"Invalid update"},{status:400});
  const result=await db.query(`UPDATE pilot_improvement_actions SET status=$2,owner=NULLIF($3,''),target_date=NULLIF($4,'')::date,updated_at=NOW() WHERE id=$1 RETURNING id`,[body.id,body.status,String(body.owner||"").trim(),String(body.targetDate||"")]);
  if(!result.rowCount)return NextResponse.json({error:"Action not found"},{status:404});
  await recordAudit({actorUserId:session.sub,actorEmail:session.email,action:"pilot.action_updated",entityType:"pilot_improvement_action",entityId:body.id,ipAddress:requestIp(request),details:{status:body.status}});
  return NextResponse.json({ok:true});
}
