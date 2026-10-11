import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { handoverState } from "@/lib/handover";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";
export async function POST(request:Request){const session=await currentAdminSession();if(!session)return NextResponse.json({error:"Forbidden"},{status:403});const body=await request.json().catch(()=>({}));const state=await handoverState();const result=await db.query(`INSERT INTO acceptance_runs(release_version,environment,status,score,checks,notes,executed_by) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7) RETURNING id`,[state.releaseVersion,String(body.environment??process.env.SMAP_ENVIRONMENT??"local"),state.summary.recommendation,state.summary.score,JSON.stringify(state.checks),String(body.notes??"").trim(),session.sub]);await recordAudit({actorUserId:session.sub,actorEmail:session.email,action:"admin.acceptance_run_recorded",entityType:"acceptance_run",entityId:result.rows[0].id,ipAddress:requestIp(request),details:{score:state.summary.score,status:state.summary.recommendation}});return NextResponse.json({ok:true,id:result.rows[0].id,score:state.summary.score,status:state.summary.recommendation});}
