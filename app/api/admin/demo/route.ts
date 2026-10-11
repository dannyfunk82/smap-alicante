import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentAdminSession } from "@/lib/admin";

export const dynamic = "force-dynamic";
type AdminBusRow = {
  bus_id: string;
  code: string;
  line_id: string;
  line_code: string;
  operational_status: string;
  speed_multiplier: number | string;
  occupancy_override: number | string | null;
  updated_at: Date | string;
};


export async function GET() {
  const session = await currentAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [settings, buses] = await Promise.all([
    db.query("SELECT simulation_speed, paused, updated_at FROM demo_settings WHERE id=1"),
    db.query(`SELECT b.id AS bus_id, b.code, b.line_id, l.code AS line_code,
                     COALESCE(c.operational_status,'in_service') AS operational_status,
                     COALESCE(c.speed_multiplier,1.00) AS speed_multiplier,
                     c.occupancy_override, COALESCE(c.updated_at,NOW()) AS updated_at
              FROM buses b JOIN lines l ON l.id=b.line_id
              LEFT JOIN demo_bus_controls c ON c.bus_id=b.id
              WHERE b.source_id IS NULL
              ORDER BY b.code`),
  ]);
  const setting = settings.rows[0];
  return NextResponse.json({
    settings: {
      simulationSpeed: Number(setting?.simulation_speed ?? 1),
      paused: Boolean(setting?.paused),
      updatedAt: new Date(setting?.updated_at ?? Date.now()).toISOString(),
    },
    buses: buses.rows.map((row: AdminBusRow) => ({
      busId: row.bus_id,
      code: row.code,
      lineId: row.line_id,
      lineCode: row.line_code,
      operationalStatus: row.operational_status,
      speedMultiplier: Number(row.speed_multiplier),
      occupancyOverride: row.occupancy_override == null ? null : Number(row.occupancy_override),
      updatedAt: new Date(row.updated_at).toISOString(),
    })),
  });
}
