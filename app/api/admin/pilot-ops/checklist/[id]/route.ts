import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const session=await currentAdminSession();if(!session)return NextResponse.json({error:"Forbidden"},{status:403});
  const {id}=await params;const body=await request.json().catch(()=>null) as {completed?:boolean;notes?:string}|null;
  if(!body)return NextResponse.json({error:"Invalid request"},{status:400});
  const completed=body.completed===true;const result=await db.query(`UPDATE pilot_checklist SET completed=$2,notes=$3,completed_by=CASE WHEN $2 THEN $4 ELSE NULL END,completed_at=CASE WHEN $2 THEN NOW() ELSE NULL END,updated_at=NOW() WHERE id=$1 RETURNING id`,[Number(id),completed,String(body.notes??"").trim().slice(0,1000)||null,session.sub]);
  if(!result.rowCount)return NextResponse.json({error:"Not found"},{status:404});
  await recordAudit({actorUserId:session.sub,actorEmail:session.email,action:"pilot.checklist_updated",entityType:"pilot_checklist",entityId:id,ipAddress:requestIp(request),details:{completed}});
  return NextResponse.json({ok:true});
}
