import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentAdminSession } from "@/lib/admin";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

export async function PATCH(request: Request) {
  const session = await currentAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as { simulationSpeed?: number; paused?: boolean } | null;
  const simulationSpeed = Number(body?.simulationSpeed ?? 1);
  if (!Number.isFinite(simulationSpeed) || simulationSpeed < .25 || simulationSpeed > 4) return NextResponse.json({ error: "Invalid simulation speed" }, { status: 400 });
  await db.query(
    `INSERT INTO demo_settings(id,simulation_speed,paused,updated_at) VALUES(1,$1,$2,NOW())
     ON CONFLICT(id) DO UPDATE SET simulation_speed=EXCLUDED.simulation_speed,paused=EXCLUDED.paused,updated_at=NOW()`,
    [simulationSpeed, Boolean(body?.paused)],
  );
  await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "admin.simulation_settings_changed", entityType: "simulation", ipAddress: requestIp(request), details: { simulationSpeed, paused: Boolean(body?.paused) } });
  return NextResponse.json({ ok: true });
}
