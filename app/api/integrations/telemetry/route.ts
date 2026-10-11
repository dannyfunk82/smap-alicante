import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { integrationKeyValid } from "@/lib/integration";

export const dynamic = "force-dynamic";

type VehicleInput = {
  vehicleId?: string;
  lineExternalId?: string;
  lineCode?: string;
  latitude?: number;
  longitude?: number;
  direction?: "outbound" | "inbound";
  nextStopExternalId?: string;
  nextStopCode?: string;
  etaSeconds?: number;
  passengerCount?: number;
  capacity?: number;
  occupancyPercentage?: number;
  status?: "in_service" | "stopped" | "out_of_service" | "gps_lost";
  recordedAt?: string;
};

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
}

export async function POST(request: Request) {
  if (!integrationKeyValid(request)) return NextResponse.json({ error: "Invalid integration key" }, { status: 401 });
  const body = await request.json().catch(() => null) as { sourceCode?: string; vehicles?: VehicleInput[] } | null;
  const sourceCode = String(body?.sourceCode ?? "").trim();
  const vehicles = Array.isArray(body?.vehicles) ? body.vehicles.slice(0, 200) : [];
  if (!sourceCode || vehicles.length === 0) return NextResponse.json({ error: "sourceCode and vehicles are required" }, { status: 400 });

  const sourceResult = await db.query("SELECT id, code FROM integration_sources WHERE code=$1 AND enabled=TRUE", [sourceCode]);
  const source = sourceResult.rows[0];
  if (!source) return NextResponse.json({ error: "Integration source not enabled" }, { status: 404 });

  const client = await db.connect();
  let applied = 0;
  const errors: string[] = [];
  try {
    await client.query("BEGIN");
    for (const vehicle of vehicles) {
      try {
        const vehicleId = String(vehicle.vehicleId ?? "").trim();
        if (!vehicleId || !Number.isFinite(Number(vehicle.latitude)) || !Number.isFinite(Number(vehicle.longitude))) throw new Error("vehicleId and coordinates are required");
        if (!vehicle.lineExternalId && !vehicle.lineCode) throw new Error(`line identifier is required for ${vehicleId}`);
        const lineResult = vehicle.lineExternalId
          ? await client.query("SELECT id FROM lines WHERE source_id=$1 AND external_id=$2", [source.id, vehicle.lineExternalId])
          : await client.query("SELECT id FROM lines WHERE code=$1 OR external_id=$1 ORDER BY source_id NULLS LAST LIMIT 1", [vehicle.lineCode]);
        const lineId = lineResult.rows[0]?.id;
        if (!lineId) throw new Error(`line not found for ${vehicleId}`);
        let nextStopId: string | null = null;
        if (vehicle.nextStopExternalId) {
          const stop = await client.query("SELECT id FROM stops WHERE source_id=$1 AND external_id=$2", [source.id, vehicle.nextStopExternalId]);
          nextStopId = stop.rows[0]?.id ?? null;
        } else if (vehicle.nextStopCode) {
          const stop = await client.query("SELECT id FROM stops WHERE code=$1 OR external_id=$1 LIMIT 1", [vehicle.nextStopCode]);
          nextStopId = stop.rows[0]?.id ?? null;
        }
        const busId = `EXT-${safeId(sourceCode)}-${safeId(vehicleId)}`;
        const capacity = Math.max(1, Math.min(300, Number(vehicle.capacity ?? 70)));
        await client.query(
          `INSERT INTO buses(id,code,line_id,capacity,status,source_id,external_id)
           VALUES($1,$2,$3,$4,'external',$5,$6)
           ON CONFLICT(id) DO UPDATE SET line_id=EXCLUDED.line_id,capacity=EXCLUDED.capacity,source_id=EXCLUDED.source_id,external_id=EXCLUDED.external_id`,
          [busId, `${sourceCode.toUpperCase()}-${vehicleId}`.slice(0, 100), lineId, capacity, source.id, vehicleId],
        );
        const recordedAt = vehicle.recordedAt && !Number.isNaN(Date.parse(vehicle.recordedAt)) ? new Date(vehicle.recordedAt) : new Date();
        const passengerCount = vehicle.passengerCount == null ? null : Math.max(0, Math.min(capacity, Number(vehicle.passengerCount)));
        const occupancyPercentage = vehicle.occupancyPercentage == null
          ? passengerCount == null ? null : Math.round(passengerCount * 100 / capacity)
          : Math.max(0, Math.min(100, Number(vehicle.occupancyPercentage)));
        await client.query(
          `INSERT INTO external_bus_positions(source_id,bus_id,latitude,longitude,direction,next_stop_id,eta_seconds,passenger_count,capacity,occupancy_percentage,operational_status,recorded_at,raw_payload)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)
           ON CONFLICT(source_id,bus_id,recorded_at) DO NOTHING`,
          [source.id, busId, Number(vehicle.latitude), Number(vehicle.longitude), vehicle.direction === "inbound" ? "inbound" : "outbound", nextStopId,
           vehicle.etaSeconds == null ? null : Math.max(0, Math.round(Number(vehicle.etaSeconds))), passengerCount, capacity, occupancyPercentage,
           vehicle.status ?? "in_service", recordedAt, JSON.stringify(vehicle)],
        );
        applied += 1;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "Invalid vehicle");
      }
    }
    const status = errors.length === vehicles.length ? "error" : errors.length > 0 ? "degraded" : "healthy";
    await client.query("UPDATE integration_sources SET last_realtime_at=NOW(),status=$2,last_error=$3,updated_at=NOW() WHERE id=$1", [source.id, status, errors[0] ?? null]);
    await client.query(
      `INSERT INTO integration_sync_runs(source_id,sync_type,status,records_received,records_applied,message,completed_at)
       VALUES($1,'realtime',$2,$3,$4,$5,NOW())`,
      [source.id, errors.length === 0 ? "completed" : applied > 0 ? "partial" : "failed", vehicles.length, applied, errors.slice(0, 5).join("; ") || null],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return NextResponse.json({ ok: applied > 0, received: vehicles.length, applied, errors });
}
