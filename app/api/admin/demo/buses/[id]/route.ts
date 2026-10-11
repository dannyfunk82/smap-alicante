import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentAdminSession } from "@/lib/admin";
import type { BusOperationalStatus } from "@/lib/types";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

const statuses: BusOperationalStatus[] = ["in_service", "stopped", "out_of_service", "gps_lost"];

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await currentAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as {
    operationalStatus?: BusOperationalStatus;
    speedMultiplier?: number;
    occupancyOverride?: number | null;
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const operationalStatus = body.operationalStatus;
  const speedMultiplier = Number(body.speedMultiplier ?? 1);
  const occupancyOverride = body.occupancyOverride == null ? null : Number(body.occupancyOverride);
  if (!operationalStatus || !statuses.includes(operationalStatus)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  if (!Number.isFinite(speedMultiplier) || speedMultiplier < 0 || speedMultiplier > 4) return NextResponse.json({ error: "Invalid speed" }, { status: 400 });
  if (occupancyOverride != null && (!Number.isFinite(occupancyOverride) || occupancyOverride < 0 || occupancyOverride > 100)) return NextResponse.json({ error: "Invalid occupancy" }, { status: 400 });

  const result = await db.query(
    `INSERT INTO demo_bus_controls(bus_id,operational_status,speed_multiplier,occupancy_override,updated_at)
     VALUES($1,$2,$3,$4,NOW())
     ON CONFLICT(bus_id) DO UPDATE SET operational_status=EXCLUDED.operational_status,
       speed_multiplier=EXCLUDED.speed_multiplier,occupancy_override=EXCLUDED.occupancy_override,updated_at=NOW()
     RETURNING bus_id`,
    [id, operationalStatus, speedMultiplier, occupancyOverride],
  );
  if (!result.rowCount) return NextResponse.json({ error: "Bus not found" }, { status: 404 });
  await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "admin.bus_control_changed", entityType: "bus", entityId: id, ipAddress: requestIp(request), details: { operationalStatus, speedMultiplier, occupancyOverride } });
  return NextResponse.json({ ok: true });
}
