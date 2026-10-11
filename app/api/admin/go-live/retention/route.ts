import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";
import { retentionCutoff } from "@/lib/go-live-policy.js";

const allowed:Record<string,{table:string;column:string}>={
 analytics:{table:"analytics_events",column:"created_at"},
 telemetry:{table:"external_bus_positions",column:"recorded_at"},
 audit:{table:"audit_logs",column:"created_at"},
 checks:{table:"system_checks",column:"checked_at"},
 notifications:{table:"notifications",column:"created_at"},
};

export async function PATCH(request:Request){
 const session=await currentAdminSession();if(!session)return NextResponse.json({error:"Forbidden"},{status:403});
 const body=await request.json();const key=String(body.key??"");if(!allowed[key])return NextResponse.json({error:"Invalid policy"},{status:400});
 await db.query(`UPDATE data_retention_policies SET retention_days=$2,enabled=$3,updated_by=$4,updated_at=NOW() WHERE policy_key=$1`,[key,Math.max(1,Math.min(3650,Number(body.retentionDays??90))),Boolean(body.enabled),session.sub]);
 return NextResponse.json({ok:true});
}

export async function POST(request:Request){
 const session=await currentAdminSession();if(!session)return NextResponse.json({error:"Forbidden"},{status:403});
 const body=await request.json().catch(()=>({}));const execute=body.mode==="execute"&&body.confirm==="DELETE";const policies=await db.query(`SELECT policy_key,retention_days,enabled FROM data_retention_policies ORDER BY policy_key`);
 const results:Array<{key:string;rows:number;cutoff:string;executed:boolean}>=[];let total=0;
 for(const row of policies.rows){const config=allowed[row.policy_key];if(!config||!row.enabled)continue;const cutoff=retentionCutoff(Number(row.retention_days));const count=await db.query(`SELECT COUNT(*)::int AS count FROM ${config.table} WHERE ${config.column} < $1`,[cutoff]);const rows=Number(count.rows[0]?.count??0);if(execute&&rows>0)await db.query(`DELETE FROM ${config.table} WHERE ${config.column} < $1`,[cutoff]);if(execute)await db.query(`UPDATE data_retention_policies SET last_run_at=NOW(),last_deleted_rows=$2,updated_by=$3,updated_at=NOW() WHERE policy_key=$1`,[row.policy_key,rows,session.sub]);results.push({key:row.policy_key,rows,cutoff:cutoff.toISOString(),executed:execute});total+=rows;}
 const run=await db.query(`INSERT INTO retention_runs(mode,results,total_rows,run_by) VALUES($1,$2::jsonb,$3,$4) RETURNING id`,[execute?"execute":"dry_run",JSON.stringify(results),total,session.sub]);
 await recordAudit({actorUserId:session.sub,actorEmail:session.email,action:execute?"admin.retention_executed":"admin.retention_previewed",entityType:"retention_run",entityId:String(run.rows[0].id),ipAddress:requestIp(request),details:{total}});
 return NextResponse.json({ok:true,mode:execute?"execute":"dry_run",total,results});
}
