import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

export async function POST(request:Request){
  const session=await currentAdminSession();if(!session)return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await request.json().catch(()=>null) as {code?:string;titleEs?:string;titleEn?:string;descriptionEs?:string;descriptionEn?:string;cohortId?:string|null;startsAt?:string|null;endsAt?:string|null}|null;
  const code=String(body?.code??"").trim().toUpperCase().replace(/[^A-Z0-9_-]/g,"-").slice(0,40);
  const titleEs=String(body?.titleEs??"").trim().slice(0,180),titleEn=String(body?.titleEn??"").trim().slice(0,180);
  if(code.length<3||!titleEs||!titleEn)return NextResponse.json({error:"Code and titles required"},{status:400});
  const result=await db.query(`INSERT INTO pilot_campaigns(cohort_id,code,title_es,title_en,description_es,description_en,status,starts_at,ends_at,created_by)
    VALUES($1,$2,$3,$4,$5,$6,'active',$7,$8,$9) RETURNING id`,[body?.cohortId||null,code,titleEs,titleEn,String(body?.descriptionEs??"").trim().slice(0,2000),String(body?.descriptionEn??"").trim().slice(0,2000),body?.startsAt||null,body?.endsAt||null,session.sub]);
  await recordAudit({actorUserId:session.sub,actorEmail:session.email,action:"pilot.campaign_created",entityType:"pilot_campaign",entityId:result.rows[0].id,ipAddress:requestIp(request),details:{code}});
  return NextResponse.json({ok:true,id:result.rows[0].id},{status:201});
}
