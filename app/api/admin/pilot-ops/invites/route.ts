import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";
import crypto from "node:crypto";

export async function POST(request: Request) {
  const session = await currentAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as { cohortId?: string; email?: string; maxUses?: number; expiresInDays?: number } | null;
  if (!body?.cohortId) return NextResponse.json({ error: "Cohort required" }, { status: 400 });
  const maxUses = Math.min(100, Math.max(1, Math.floor(Number(body.maxUses ?? 1))));
  const days = Math.min(365, Math.max(1, Math.floor(Number(body.expiresInDays ?? 30))));
  const code = `SMAP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const result = await db.query(`INSERT INTO pilot_invites(cohort_id,code,email,max_uses,expires_at,created_by)
    VALUES($1,$2,$3,$4,NOW()+($5||' days')::interval,$6) RETURNING id,code,expires_at`, [body.cohortId, code, body.email?.trim().toLowerCase() || null, maxUses, days, session.sub]);
  await recordAudit({ actorUserId:session.sub,actorEmail:session.email,action:"pilot.invite_created",entityType:"pilot_invite",entityId:result.rows[0].id,ipAddress:requestIp(request),details:{ maxUses, email:body.email||null } });
  return NextResponse.json({ ok:true,id:result.rows[0].id,code:result.rows[0].code,expiresAt:new Date(result.rows[0].expires_at).toISOString() }, { status:201 });
}
