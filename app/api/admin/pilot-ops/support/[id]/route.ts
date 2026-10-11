import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

const statuses=["open","in_progress","resolved","closed"];
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const session=await currentAdminSession();if(!session)return NextResponse.json({error:"Forbidden"},{status:403});
  const {id}=await params;const body=await request.json().catch(()=>null) as {status?:string;adminResponse?:string}|null;
  if(!body||!statuses.includes(String(body.status)))return NextResponse.json({error:"Invalid status"},{status:400});
  const result=await db.query(`UPDATE support_cases SET status=$2,admin_response=$3,assigned_to=$4,updated_at=NOW() WHERE id=$1 RETURNING user_id,subject`,[id,body.status,String(body.adminResponse??"").trim().slice(0,3000)||null,session.sub]);
  if(!result.rowCount)return NextResponse.json({error:"Not found"},{status:404});
  const response=String(body.adminResponse??"").trim();if(response){await db.query(`INSERT INTO notifications(user_id,type,title_es,title_en,body_es,body_en) VALUES($1,'support','Actualización de soporte','Support update',$2,$2)`,[result.rows[0].user_id,response]);}
  await recordAudit({actorUserId:session.sub,actorEmail:session.email,action:"support.case_updated",entityType:"support_case",entityId:id,ipAddress:requestIp(request),details:{status:body.status}});
  return NextResponse.json({ok:true});
}
