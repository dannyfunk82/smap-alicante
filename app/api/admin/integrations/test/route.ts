import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

export async function POST(request: Request) {
  const session = await currentAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const source = (await db.query("SELECT id,code FROM integration_sources WHERE enabled=TRUE ORDER BY code LIMIT 1")).rows[0];
  if (!source) return NextResponse.json({ error: "No enabled integration source" }, { status: 400 });
  const lines = await db.query("SELECT id,code FROM lines ORDER BY code LIMIT 3");
  let applied = 0;
  for (const [index, line] of lines.rows.entries()) {
    const stop = (await db.query("SELECT s.id,s.latitude,s.longitude FROM line_stops ls JOIN stops s ON s.id=ls.stop_id WHERE ls.line_id=$1 ORDER BY ls.sequence OFFSET $2 LIMIT 1", [line.id, Math.floor((Date.now()/5000 + index*2) % 8)])).rows[0];
    if (!stop) continue;
    const vehicleId = `TEST-${index+1}`;
    const busId = `EXT-${source.code}-${vehicleId}`;
    await db.query(`INSERT INTO buses(id,code,line_id,capacity,status,source_id,external_id) VALUES($1,$2,$3,70,'external',$4,$5)
      ON CONFLICT(id) DO UPDATE SET line_id=EXCLUDED.line_id,source_id=EXCLUDED.source_id`, [busId, `${source.code.toUpperCase()}-${vehicleId}`.slice(0, 100), line.id, source.id, vehicleId]);
    await db.query(`INSERT INTO external_bus_positions(source_id,bus_id,latitude,longitude,direction,next_stop_id,eta_seconds,passenger_count,capacity,occupancy_percentage,operational_status,recorded_at,raw_payload)
      VALUES($1,$2,$3,$4,'outbound',$5,$6,$7,70,$8,'in_service',NOW(),'{"test":true}'::jsonb)`,
      [source.id,busId,Number(stop.latitude)+index*.0002,Number(stop.longitude)+index*.0002,stop.id,60+index*90,15+index*17,22+index*24]);
    applied += 1;
  }
  await db.query("UPDATE integration_sources SET status='healthy',last_realtime_at=NOW(),last_error=NULL,updated_at=NOW() WHERE id=$1", [source.id]);
  await db.query(`INSERT INTO integration_sync_runs(source_id,sync_type,status,records_received,records_applied,message,completed_at) VALUES($1,'test','completed',$2,$2,'Admin test telemetry',NOW())`, [source.id, applied]);
  await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "admin.integration_test_telemetry", entityType: "integration", entityId: source.id, ipAddress: requestIp(request), details: { applied } });
  return NextResponse.json({ ok: true, applied });
}
