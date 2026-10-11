import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

export async function POST(request: Request) {
  const session = await currentAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const result = await db.query("DELETE FROM external_bus_positions");
  await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "admin.integration_telemetry_cleared", entityType: "integration", ipAddress: requestIp(request), details: { deleted: result.rowCount } });
  return NextResponse.json({ ok: true, deleted: result.rowCount });
}
