import { NextResponse } from "next/server";
import { currentApiSession } from "@/lib/api-session";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

export async function POST(request: Request) {
  const session = await currentApiSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { code?: string } | null;
  const code = String(body?.code ?? "").trim().toUpperCase();
  if (code.length < 6 || code.length > 64) return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const invite = await client.query(`SELECT pi.*,pc.code AS cohort_code,pc.name AS cohort_name,pc.status AS cohort_status
      FROM pilot_invites pi JOIN pilot_cohorts pc ON pc.id=pi.cohort_id WHERE UPPER(pi.code)=$1 FOR UPDATE`, [code]);
    const row = invite.rows[0];
    if (!row || row.status !== "active" || row.cohort_status === "cancelled" || (row.expires_at && new Date(row.expires_at) < new Date()) || Number(row.used_count) >= Number(row.max_uses)) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Invite unavailable or expired" }, { status: 400 });
    }
    if (row.email && String(row.email).toLowerCase() !== session.email.toLowerCase()) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Invite assigned to another email" }, { status: 403 });
    }
    const existing = await client.query("SELECT invite_id FROM pilot_memberships WHERE user_id=$1", [session.sub]);
    await client.query(`INSERT INTO pilot_memberships(user_id,cohort_id,invite_id) VALUES($1,$2,$3)
      ON CONFLICT(user_id) DO UPDATE SET cohort_id=EXCLUDED.cohort_id,invite_id=EXCLUDED.invite_id,status='active',updated_at=NOW()`, [session.sub, row.cohort_id, row.id]);
    if (!existing.rows[0] || existing.rows[0].invite_id !== row.id) {
      await client.query(`UPDATE pilot_invites SET used_count=used_count+1,status=CASE WHEN used_count+1>=max_uses THEN 'exhausted' ELSE status END WHERE id=$1`, [row.id]);
    }
    await client.query("UPDATE users SET pilot_participant=TRUE,updated_at=NOW() WHERE id=$1", [session.sub]);
    await client.query("INSERT INTO onboarding_progress(user_id,welcome_completed) VALUES($1,TRUE) ON CONFLICT(user_id) DO UPDATE SET welcome_completed=TRUE,updated_at=NOW()", [session.sub]);
    await client.query("COMMIT");
    await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "pilot.invite_redeemed", entityType: "pilot_invite", entityId: row.id, ipAddress: requestIp(request), details: { cohort: row.cohort_code } });
    return NextResponse.json({ ok: true, cohortCode: row.cohort_code, cohortName: row.cohort_name });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
