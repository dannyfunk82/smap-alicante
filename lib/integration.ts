import { db } from "@/lib/db";
import { occupancyLevelForPercentage } from "@/lib/domain.js";
import { chooseBusSource, telemetryFreshness } from "@/lib/integration-policy.js";
import type { BusLive, BusOperationalStatus, IntegrationMode, IntegrationStatus, Line, Stop } from "@/lib/types";

export type IntegrationSettingsRow = {
  mode: IntegrationMode;
  fallback_enabled: boolean;
  max_age_seconds: number | string;
  active_source_id: string | null;
};


type IntegrationSourceRow = {
  id: string; code: string; name: string; provider_type: "demo" | "gtfs" | "avanza" | "custom"; enabled: boolean;
  status: "configured" | "healthy" | "degraded" | "error" | "disabled"; last_static_sync_at: Date | string | null;
  last_realtime_at: Date | string | null; last_error: string | null; metadata: Record<string, unknown> | null; updated_at: Date | string;
};
type IntegrationSyncRow = {
  id: number | string; source_id: string | null; source_code: string | null; sync_type: "static" | "realtime" | "test";
  status: "running" | "completed" | "partial" | "failed"; records_received: number | string; records_applied: number | string;
  message: string | null; started_at: Date | string; completed_at: Date | string | null;
};
type TelemetrySummaryRow = { vehicle_count: number | string; last_update: Date | string | null };

type ExternalPositionRow = {
  bus_id: string;
  bus_code: string;
  line_id: string;
  line_code: string;
  line_color: string;
  capacity: number;
  latitude: number | string;
  longitude: number | string;
  direction: "outbound" | "inbound";
  next_stop_id: string | null;
  eta_seconds: number | string | null;
  passenger_count: number | string | null;
  position_capacity: number | string | null;
  occupancy_percentage: number | string | null;
  operational_status: BusOperationalStatus;
  recorded_at: Date | string;
};

export async function loadIntegrationSettings() {
  const result = await db.query<IntegrationSettingsRow>(
    `SELECT mode, fallback_enabled, max_age_seconds, active_source_id
       FROM integration_settings WHERE id=1`,
  );
  const row = result.rows[0] ?? { mode: "demo", fallback_enabled: true, max_age_seconds: 45, active_source_id: null };
  return {
    mode: row.mode,
    fallbackEnabled: Boolean(row.fallback_enabled),
    maxAgeSeconds: Number(row.max_age_seconds),
    activeSourceId: row.active_source_id,
  };
}

function fallbackStop(line: Line, latitude: number, longitude: number): Stop {
  return [...line.stops].sort((a, b) => {
    const ad = Math.abs(a.latitude - latitude) + Math.abs(a.longitude - longitude);
    const bd = Math.abs(b.latitude - latitude) + Math.abs(b.longitude - longitude);
    return ad - bd;
  })[0] ?? { id: "unknown", code: "—", name: "—", latitude, longitude, accessible: true, sequence: 1 };
}

export async function loadExternalBuses(lines: Line[], maxAgeSeconds: number, activeSourceId: string | null) {
  const params: unknown[] = [];
  const sourceFilter = activeSourceId ? "AND p.source_id=$1" : "";
  if (activeSourceId) params.push(activeSourceId);
  const result = await db.query<ExternalPositionRow>(
    `SELECT DISTINCT ON (p.bus_id)
            p.bus_id, b.code AS bus_code, b.line_id, l.code AS line_code, l.color AS line_color,
            b.capacity, p.latitude, p.longitude, p.direction, p.next_stop_id, p.eta_seconds,
            p.passenger_count, p.capacity AS position_capacity, p.occupancy_percentage,
            p.operational_status, p.recorded_at
       FROM external_bus_positions p
       JOIN buses b ON b.id=p.bus_id
       JOIN lines l ON l.id=b.line_id
       JOIN integration_sources s ON s.id=p.source_id AND s.enabled=TRUE
      WHERE TRUE ${sourceFilter}
      ORDER BY p.bus_id, p.recorded_at DESC`,
    params,
  );
  const lineById = new Map(lines.map((line) => [line.id, line]));
  const now = Date.now();
  const buses: BusLive[] = [];
  let freshCount = 0;
  let staleCount = 0;
  let lastExternalUpdate: string | null = null;

  for (const row of result.rows) {
    const line = lineById.get(row.line_id);
    if (!line || line.stops.length === 0) continue;
    const recordedAt = new Date(row.recorded_at).toISOString();
    const dataFreshness = telemetryFreshness(recordedAt, maxAgeSeconds, now);
    if (dataFreshness === "live") freshCount += 1; else staleCount += 1;
    if (!lastExternalUpdate || recordedAt > lastExternalUpdate) lastExternalUpdate = recordedAt;
    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);
    const nextStop = line.stops.find((stop) => stop.id === row.next_stop_id) ?? fallbackStop(line, latitude, longitude);
    const capacity = Number(row.position_capacity ?? row.capacity ?? 70);
    const passengerCount = Number(row.passenger_count ?? 0);
    const occupancyPercentage = row.occupancy_percentage == null
      ? Math.min(100, Math.max(0, Math.round(passengerCount * 100 / Math.max(1, capacity))))
      : Number(row.occupancy_percentage);
    buses.push({
      id: row.bus_id,
      code: row.bus_code,
      lineId: row.line_id,
      lineCode: row.line_code,
      lineColor: row.line_color,
      latitude,
      longitude,
      direction: row.direction,
      nextStop,
      etaSeconds: Math.max(0, Number(row.eta_seconds ?? 0)),
      occupancyPercentage,
      occupancyLevel: occupancyLevelForPercentage(occupancyPercentage),
      passengerCount,
      capacity,
      updatedAt: recordedAt,
      operationalStatus: dataFreshness === "stale" ? "gps_lost" : row.operational_status,
      speedMultiplier: 1,
      dataFreshness,
      source: "external",
    });
  }
  return { buses, freshCount, staleCount, lastExternalUpdate };
}

export const resolveBusSource = chooseBusSource;

export async function integrationStatus(): Promise<IntegrationStatus> {
  const settings = await loadIntegrationSettings();
  const [sources, syncs, telemetry] = await Promise.all([
    db.query<IntegrationSourceRow>(`SELECT id, code, name, provider_type, enabled, status, last_static_sync_at, last_realtime_at, last_error, metadata, updated_at
                FROM integration_sources ORDER BY code`),
    db.query<IntegrationSyncRow>(`SELECT r.id, r.source_id, s.code AS source_code, r.sync_type, r.status, r.records_received, r.records_applied,
                     r.message, r.started_at, r.completed_at
                FROM integration_sync_runs r LEFT JOIN integration_sources s ON s.id=r.source_id
               ORDER BY r.started_at DESC LIMIT 15`),
    db.query<TelemetrySummaryRow>(`SELECT COUNT(*)::int AS vehicle_count, MAX(recorded_at) AS last_update
                FROM external_bus_positions
               WHERE ($1::uuid IS NULL OR source_id=$1::uuid)`, [settings.activeSourceId]),
  ]);
  return {
    settings,
    sources: sources.rows.map((row) => ({
      id: row.id, code: row.code, name: row.name, providerType: row.provider_type,
      enabled: row.enabled, status: row.status,
      lastStaticSyncAt: row.last_static_sync_at ? new Date(row.last_static_sync_at).toISOString() : null,
      lastRealtimeAt: row.last_realtime_at ? new Date(row.last_realtime_at).toISOString() : null,
      lastError: row.last_error, metadata: row.metadata ?? {}, updatedAt: new Date(row.updated_at).toISOString(),
    })),
    recentRuns: syncs.rows.map((row) => ({
      id: Number(row.id), sourceId: row.source_id, sourceCode: row.source_code,
      syncType: row.sync_type, status: row.status, recordsReceived: Number(row.records_received), recordsApplied: Number(row.records_applied),
      message: row.message, startedAt: new Date(row.started_at).toISOString(), completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    })),
    telemetry: {
      vehicleCount: Number(telemetry.rows[0]?.vehicle_count ?? 0),
      lastUpdate: telemetry.rows[0]?.last_update ? new Date(telemetry.rows[0].last_update).toISOString() : null,
    },
  };
}

export function integrationKeyValid(request: Request) {
  const expected = process.env.INTEGRATION_API_KEY;
  if (!expected || expected.length < 16) return false;
  return request.headers.get("x-smap-integration-key") === expected;
}
