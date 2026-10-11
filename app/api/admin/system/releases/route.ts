import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

export async function POST(request: Request) {
  const session = await currentAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as { version?: string; deploymentId?: string; environment?: string; status?: string; commitRef?: string; notes?: string } | null;
  if (!body?.version || !body.deploymentId || !["local", "staging", "production"].includes(String(body.environment))) return NextResponse.json({ error: "Invalid release" }, { status: 400 });
  const status = ["prepared", "deployed", "rolled_back", "failed"].includes(String(body.status)) ? String(body.status) : "prepared";
  const result = await db.query(`INSERT INTO deployment_releases(version,deployment_id,environment,status,commit_ref,notes,deployed_by,deployed_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,CASE WHEN $4='deployed' THEN NOW() ELSE NULL END)
    ON CONFLICT(deployment_id) DO UPDATE SET status=EXCLUDED.status,commit_ref=EXCLUDED.commit_ref,notes=EXCLUDED.notes,deployed_by=EXCLUDED.deployed_by,deployed_at=CASE WHEN EXCLUDED.status='deployed' THEN NOW() ELSE deployment_releases.deployed_at END
    RETURNING id`, [body.version.slice(0, 40), body.deploymentId.slice(0, 120), body.environment, status, body.commitRef?.slice(0, 120) || null, body.notes?.slice(0, 1000) || null, session.sub]);
  await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "admin.release_recorded", entityType: "deployment_release", entityId: String(result.rows[0].id), ipAddress: requestIp(request), details: { version: body.version, deploymentId: body.deploymentId, environment: body.environment, status } });
  return NextResponse.json({ ok: true, id: Number(result.rows[0].id) });
}
