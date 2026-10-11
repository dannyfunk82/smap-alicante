import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { decisionToActionStatus } from "@/lib/closure-policy.js";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

const decisions=["approve","reject","defer","needs_data"];
export async function POST(request:Request){
  const session=await currentAdminSession();if(!session)return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await request.json().catch(()=>null) as {actionId?:string;title?:string;decision?:string;rationale?:string}|null;
  if(!body?.title||body.title.trim().length<3||!body.rationale||body.rationale.trim().length<5||!body.decision||!decisions.includes(body.decision))return NextResponse.json({error:"Invalid decision"},{status:400});
  const client=await db.connect();
  try{await client.query("BEGIN");const result=await client.query(`INSERT INTO pilot_decisions(action_id,title,decision,rationale,decided_by) VALUES(NULLIF($1,'')::uuid,$2,$3,$4,$5) RETURNING id`,[body.actionId||"",body.title.trim(),body.decision,body.rationale.trim(),session.sub]);if(body.actionId)await client.query(`UPDATE pilot_improvement_actions SET status=$2,updated_at=NOW() WHERE id=$1`,[body.actionId,decisionToActionStatus(body.decision)]);await client.query("COMMIT");await recordAudit({actorUserId:session.sub,actorEmail:session.email,action:"pilot.decision_recorded",entityType:"pilot_decision",entityId:result.rows[0].id,ipAddress:requestIp(request),details:{decision:body.decision,actionId:body.actionId||null}});return NextResponse.json({ok:true,id:result.rows[0].id},{status:201});}catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}
