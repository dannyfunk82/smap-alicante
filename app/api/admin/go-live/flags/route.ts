import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";
export async function PATCH(request:Request){
 const session=await currentAdminSession();if(!session)return NextResponse.json({error:"Forbidden"},{status:403});
 const body=await request.json();const key=String(body.key??"");const rollout=Math.max(0,Math.min(100,Number(body.rolloutPercent??100)));const environments=Array.isArray(body.environments)?body.environments.filter((value:unknown)=>["local","staging","production"].includes(String(value))):[];
 const result=await db.query(`UPDATE feature_flags SET enabled=$2,rollout_percent=$3,environments=$4::text[],updated_by=$5,updated_at=NOW() WHERE flag_key=$1 RETURNING flag_key`,[key,Boolean(body.enabled),rollout,environments,session.sub]);
 if(!result.rowCount)return NextResponse.json({error:"Flag not found"},{status:404});
 await recordAudit({actorUserId:session.sub,actorEmail:session.email,action:"admin.feature_flag_updated",entityType:"feature_flag",entityId:key,ipAddress:requestIp(request),details:{enabled:Boolean(body.enabled),rolloutPercent:rollout,environments}});
 return NextResponse.json({ok:true});
}
