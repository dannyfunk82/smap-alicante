import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

export async function POST(request:Request){
  const session=await currentAdminSession();if(!session)return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await request.json().catch(()=>null) as {cohortId?:string|null;campaignId?:string|null;titleEs?:string;titleEn?:string;bodyEs?:string;bodyEn?:string}|null;
  const titleEs=String(body?.titleEs??"").trim().slice(0,180),titleEn=String(body?.titleEn??"").trim().slice(0,180),bodyEs=String(body?.bodyEs??"").trim().slice(0,3000),bodyEn=String(body?.bodyEn??"").trim().slice(0,3000);
  if(!titleEs||!titleEn||!bodyEs||!bodyEn)return NextResponse.json({error:"Bilingual title and message required"},{status:400});
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const recipients=await client.query(`SELECT DISTINCT pm.user_id FROM pilot_memberships pm WHERE pm.status='active' AND ($1::uuid IS NULL OR pm.cohort_id=$1)`,[body?.cohortId||null]);
    const broadcast=await client.query(`INSERT INTO pilot_broadcasts(cohort_id,campaign_id,title_es,title_en,body_es,body_en,status,recipient_count,created_by,sent_at)
      VALUES($1,$2,$3,$4,$5,$6,'sent',$7,$8,NOW()) RETURNING id`,[body?.cohortId||null,body?.campaignId||null,titleEs,titleEn,bodyEs,bodyEn,recipients.rowCount,session.sub]);
    for(const recipient of recipients.rows){await client.query(`INSERT INTO notifications(user_id,type,title_es,title_en,body_es,body_en) VALUES($1,'campaign',$2,$3,$4,$5)`,[recipient.user_id,titleEs,titleEn,bodyEs,bodyEn]);}
    await client.query("COMMIT");
    await recordAudit({actorUserId:session.sub,actorEmail:session.email,action:"pilot.broadcast_sent",entityType:"pilot_broadcast",entityId:broadcast.rows[0].id,ipAddress:requestIp(request),details:{recipientCount:recipients.rowCount}});
    return NextResponse.json({ok:true,id:broadcast.rows[0].id,recipientCount:recipients.rowCount},{status:201});
  }catch(error){await client.query("ROLLBACK").catch(()=>undefined);throw error;}finally{client.release();}
}
