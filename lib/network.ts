import { db } from "@/lib/db";
import { computeLiveBuses } from "@/lib/demo";
import { fareForStops } from "@/lib/domain.js";
import { loadExternalBuses, loadIntegrationSettings, resolveBusSource } from "@/lib/integration";
import type { BusLive, BusOperationalStatus, JourneyOption, Line, Locale, NetworkResponse, Stop, StopArrival } from "@/lib/types";

const SEGMENT_SECONDS = 28;
type BusDbRow = {
  id: string;
  code: string;
  line_id: string;
  capacity: number;
  operational_status: BusOperationalStatus;
  speed_multiplier: number | string;
  occupancy_override: number | string | null;
  control_updated_at: Date | string | null;
};

type StopDbRow = { id: string };


export async function loadNetwork(locale: Locale): Promise<NetworkResponse> {
  const lineName = locale === "en" ? "name_en" : "name_es";
  const stopName = locale === "en" ? "s.name_en" : "s.name_es";
  const integrationSettings = await loadIntegrationSettings();
  const useGtfsNetwork = integrationSettings.mode !== "demo" && Boolean(integrationSettings.activeSourceId);
  const lineFilterSql = useGtfsNetwork ? "WHERE source_id=$1" : "WHERE source_id IS NULL";
  const lineParams = useGtfsNetwork ? [integrationSettings.activeSourceId] : [];
  const [linesResult, stopsResult, busesResult, settingsResult, datasetResult] = await Promise.all([
    db.query(`SELECT id, code, ${lineName} AS name, color FROM lines ${lineFilterSql} ORDER BY code`, lineParams),
    db.query(`SELECT ls.line_id, ls.sequence, s.id, s.code, ${stopName} AS name, s.latitude, s.longitude, s.accessible
              FROM line_stops ls JOIN stops s ON s.id = ls.stop_id
             WHERE ls.line_id IN (SELECT id FROM lines ${lineFilterSql})
             ORDER BY ls.line_id, ls.sequence`, lineParams),
    db.query(`SELECT b.id, b.code, b.line_id, b.capacity,
                     COALESCE(c.operational_status, 'in_service') AS operational_status,
                     COALESCE(c.speed_multiplier, 1.00) AS speed_multiplier,
                     c.occupancy_override,
                     c.updated_at AS control_updated_at
              FROM buses b
              LEFT JOIN demo_bus_controls c ON c.bus_id = b.id
              WHERE b.source_id IS NULL
              ORDER BY b.code`),
    db.query("SELECT simulation_speed, paused, updated_at FROM demo_settings WHERE id=1"),
    useGtfsNetwork
      ? db.query(`SELECT d.provider_name,d.attribution_text,d.source_url,d.imported_at,d.valid_from,d.valid_to,d.route_count,d.stop_count,s.name AS source_name
                    FROM gtfs_datasets d JOIN integration_sources s ON s.id=d.source_id WHERE d.source_id=$1`, [integrationSettings.activeSourceId])
      : Promise.resolve({ rows: [] }),
  ]);

  const stopsByLine = new Map<string, Line["stops"]>();
  for (const row of stopsResult.rows) {
    const current = stopsByLine.get(row.line_id) ?? [];
    current.push({ id: row.id, code: row.code, name: row.name, latitude: Number(row.latitude), longitude: Number(row.longitude), accessible: row.accessible, sequence: row.sequence });
    stopsByLine.set(row.line_id, current);
  }

  const lines: Line[] = linesResult.rows.map((line: { id: string; code: string; name: string; color: string }) => ({ ...line, stops: stopsByLine.get(line.id) ?? [] })).filter((line: Line) => line.stops.length > 1);
  const settingsRow = settingsResult.rows[0] ?? { simulation_speed: 1, paused: false, updated_at: new Date().toISOString() };
  const simulation = {
    speed: Number(settingsRow.simulation_speed),
    paused: Boolean(settingsRow.paused),
    updatedAt: new Date(settingsRow.updated_at).toISOString(),
  };

  const demoBuses = computeLiveBuses(
    lines,
    busesResult.rows.map((row: BusDbRow) => ({
      id: row.id,
      code: row.code,
      lineId: row.line_id,
      capacity: row.capacity,
      operationalStatus: row.operational_status as BusOperationalStatus,
      speedMultiplier: Number(row.speed_multiplier),
      occupancyOverride: row.occupancy_override == null ? null : Number(row.occupancy_override),
      controlUpdatedAt: row.control_updated_at ? new Date(row.control_updated_at).toISOString() : null,
    })),
    simulation,
  );

  const external = await loadExternalBuses(lines, integrationSettings.maxAgeSeconds, integrationSettings.activeSourceId);
  const selected = resolveBusSource(integrationSettings.mode, integrationSettings.fallbackEnabled, demoBuses, external.buses);
  const disrupted = selected.buses.some((bus) => bus.operationalStatus !== "in_service");
  const serviceStatus = simulation.paused ? "paused" : disrupted ? "degraded" : "normal";
  const dataset = datasetResult.rows[0] as Record<string, unknown> | undefined;
  return {
    demo: selected.active === "demo",
    lines,
    buses: selected.buses,
    stopCount: new Set(stopsResult.rows.map((row: StopDbRow) => row.id)).size,
    busCount: selected.buses.length,
    generatedAt: new Date().toISOString(),
    simulation: { speed: simulation.speed, paused: simulation.paused, serviceStatus },
    staticData: dataset ? {
      kind: "gtfs",
      sourceName: String(dataset.source_name),
      providerName: String(dataset.provider_name),
      attributionText: String(dataset.attribution_text),
      sourceUrl: String(dataset.source_url),
      importedAt: new Date(String(dataset.imported_at)).toISOString(),
      validFrom: dataset.valid_from ? String(dataset.valid_from).slice(0,10) : null,
      validTo: dataset.valid_to ? String(dataset.valid_to).slice(0,10) : null,
      routeCount: Number(dataset.route_count),
      stopCount: Number(dataset.stop_count),
    } : {
      kind: "demo", sourceName: "SMAP Demo", providerName: null, attributionText: null, sourceUrl: null,
      importedAt: null, validFrom: null, validTo: null, routeCount: lines.length,
      stopCount: new Set(stopsResult.rows.map((row: StopDbRow) => row.id)).size,
    },
    dataSource: {
      mode: integrationSettings.mode,
      active: selected.active,
      fallbackActive: selected.fallbackActive,
      externalFreshCount: external.freshCount,
      externalStaleCount: external.staleCount,
      lastExternalUpdate: external.lastExternalUpdate,
      maxAgeSeconds: integrationSettings.maxAgeSeconds,
    },
  };
}

export function uniqueStops(lines: Line[]): Stop[] {
  const seen = new Map<string, Stop>();
  for (const line of lines) for (const stop of line.stops) if (!seen.has(stop.id)) seen.set(stop.id, stop);
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function busCanServe(bus: BusLive) {
  return bus.operationalStatus === "in_service" && bus.dataFreshness === "live";
}

export function arrivalsForStop(network: NetworkResponse, stopId: string): StopArrival[] {
  const results: StopArrival[] = [];
  if (network.simulation.paused) return results;
  for (const line of network.lines) {
    const target = line.stops.find((stop) => stop.id === stopId);
    if (!target) continue;
    for (const bus of network.buses.filter((item) => item.lineId === line.id && busCanServe(item))) {
      const nextSequence = bus.nextStop.sequence;
      const approaching = bus.direction === "outbound" ? target.sequence >= nextSequence : target.sequence <= nextSequence;
      if (!approaching) continue;
      const segmentsAway = Math.abs(target.sequence - nextSequence);
      results.push({
        busId: bus.id,
        busCode: bus.code,
        lineId: line.id,
        lineCode: line.code,
        lineColor: line.color,
        direction: bus.direction,
        etaSeconds: bus.etaSeconds + segmentsAway * SEGMENT_SECONDS,
        occupancyPercentage: bus.occupancyPercentage,
        occupancyLevel: bus.occupancyLevel,
      });
    }
  }
  return results.sort((a, b) => a.etaSeconds - b.etaSeconds).slice(0, 6);
}

function nextBusForJourney(buses: BusLive[], line: Line, origin: Stop, direction: "outbound" | "inbound") {
  return buses
    .filter((bus) => bus.lineId === line.id && bus.direction === direction && busCanServe(bus))
    .map((bus) => {
      const approaching = direction === "outbound" ? origin.sequence >= bus.nextStop.sequence : origin.sequence <= bus.nextStop.sequence;
      if (!approaching) return null;
      return { bus, etaSeconds: bus.etaSeconds + Math.abs(origin.sequence - bus.nextStop.sequence) * SEGMENT_SECONDS };
    })
    .filter((item): item is { bus: BusLive; etaSeconds: number } => Boolean(item))
    .sort((a, b) => a.etaSeconds - b.etaSeconds)[0] ?? null;
}

export function planDirectJourneys(network: NetworkResponse, originStopId: string, destinationStopId: string): JourneyOption[] {
  if (!originStopId || !destinationStopId || originStopId === destinationStopId) return [];
  const options: JourneyOption[] = [];
  for (const line of network.lines) {
    const origin = line.stops.find((stop) => stop.id === originStopId);
    const destination = line.stops.find((stop) => stop.id === destinationStopId);
    if (!origin || !destination) continue;
    const stopCount = Math.abs(destination.sequence - origin.sequence);
    if (!stopCount) continue;
    const direction = destination.sequence > origin.sequence ? "outbound" : "inbound";
    const next = network.simulation.paused ? null : nextBusForJourney(network.buses, line, origin, direction);
    options.push({
      lineId: line.id,
      lineCode: line.code,
      lineName: line.name,
      lineColor: line.color,
      originStopId,
      originName: origin.name,
      destinationStopId,
      destinationName: destination.name,
      direction,
      stopCount,
      durationMinutes: Math.max(3, Math.ceil((stopCount * SEGMENT_SECONDS + stopCount * 18) / 60)),
      nextBusCode: next?.bus.code ?? null,
      nextBusEtaSeconds: next?.etaSeconds ?? null,
      occupancyLevel: next?.bus.occupancyLevel ?? null,
      occupancyPercentage: next?.bus.occupancyPercentage ?? null,
      fares: (["single", "return", "daily"] as const).map((ticketType) => ({ ticketType, price: fareForStops(stopCount, ticketType) })),
    });
  }
  return options.sort((a, b) => (a.nextBusEtaSeconds ?? Number.MAX_SAFE_INTEGER) - (b.nextBusEtaSeconds ?? Number.MAX_SAFE_INTEGER));
}
