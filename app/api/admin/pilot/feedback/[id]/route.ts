import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { feedbackStatusTransition } from "@/lib/pilot-policy.js";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await currentAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { status?: string; adminResponse?: string } | null;
  const current = await db.query("SELECT status,user_id FROM feedback_reports WHERE id=$1", [id]);
  if (!current.rowCount) return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  const nextStatus = String(body?.status ?? current.rows[0].status);
  if (nextStatus !== current.rows[0].status && !feedbackStatusTransition(current.rows[0].status, nextStatus)) return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
  const response = String(body?.adminResponse ?? "").trim().slice(0,2000) || null;
  await db.query(`UPDATE feedback_reports SET status=$2,admin_response=$3,assigned_to=$4,updated_at=NOW(),resolved_at=CASE WHEN $2 IN ('resolved','closed') THEN NOW() ELSE NULL END WHERE id=$1`, [id,nextStatus,response,session.sub]);
  if (response || ["resolved","closed"].includes(nextStatus)) {
    await db.query(`INSERT INTO notifications(user_id,type,title_es,title_en,body_es,body_en)
      VALUES($1,'feedback_update','Tu comentario tiene una actualización','Your feedback has an update',$2,$3)`, [current.rows[0].user_id,response || `Estado actualizado: ${nextStatus}`,response || `Status updated: ${nextStatus}`]);
  }
  await recordAudit({ actorUserId:session.sub,actorEmail:session.email,action:"admin.feedback_updated",entityType:"feedback",entityId:id,ipAddress:requestIp(request),details:{ status:nextStatus,hasResponse:Boolean(response) } });
  return NextResponse.json({ ok:true });
}
