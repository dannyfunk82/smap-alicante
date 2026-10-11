import crypto from "node:crypto";
import type { BusLive, BusOperationalStatus, Line } from "@/lib/types";
import { clampPercentage, occupancyLevelForPercentage } from "@/lib/domain.js";

const SEGMENT_SECONDS = 28;

function numericSeed(value: string) {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

type BusInput = {
  id: string;
  code: string;
  lineId: string;
  capacity: number;
  operationalStatus?: BusOperationalStatus;
  speedMultiplier?: number;
  occupancyOverride?: number | null;
  controlUpdatedAt?: string | null;
};

type SimulationInput = {
  speed?: number;
  paused?: boolean;
  updatedAt?: string | null;
};

export function computeLiveBuses(
  lines: Line[],
  buses: BusInput[],
  simulation: SimulationInput = {},
  now = Date.now(),
): BusLive[] {
  const byLine = new Map(lines.map((line) => [line.id, line]));
  const globalSpeed = Math.max(0.25, Math.min(4, Number(simulation.speed ?? 1)));
  const globalFrozenAt = simulation.paused && simulation.updatedAt ? new Date(simulation.updatedAt).getTime() : now;

  return buses.flatMap((bus) => {
    const line = byLine.get(bus.lineId);
    if (!line || line.stops.length < 2) return [];

    const operationalStatus = bus.operationalStatus ?? "in_service";
    const busSpeed = Math.max(0, Math.min(4, Number(bus.speedMultiplier ?? 1)));
    const frozen = operationalStatus !== "in_service" || simulation.paused;
    const positionTime = frozen && bus.controlUpdatedAt
      ? new Date(bus.controlUpdatedAt).getTime()
      : globalFrozenAt;
    const seconds = positionTime / 1000;
    const maxSegment = line.stops.length - 1;
    const cycleSegments = maxSegment * 2;
    const offset = numericSeed(bus.code) * 3.7;
    const effectiveSpeed = Math.max(0.05, globalSpeed * Math.max(busSpeed, 0.05));
    const raw = ((seconds * effectiveSpeed + offset) / SEGMENT_SECONDS) % cycleSegments;
    const outbound = raw < maxSegment;
    const routePosition = outbound ? raw : cycleSegments - raw;
    const segment = Math.min(Math.floor(routePosition), maxSegment - 1);
    const fraction = Math.max(0, Math.min(1, routePosition - segment));
    const from = line.stops[segment];
    const to = line.stops[segment + 1];
    const latitude = from.latitude + (to.latitude - from.latitude) * fraction;
    const longitude = from.longitude + (to.longitude - from.longitude) * fraction;
    const nextStop = outbound ? to : from;
    const nextStopSequence = outbound ? segment + 2 : segment + 1;
    const remainingSeconds = outbound ? (1 - fraction) * SEGMENT_SECONDS : fraction * SEGMENT_SECONDS;
    const wave = (Math.sin(now / 1000 / 37 + numericSeed(bus.code)) + 1) / 2;
    const generatedOccupancy = Math.round(14 + wave * 82);
    const occupancyPercentage = bus.occupancyOverride == null
      ? generatedOccupancy
      : clampPercentage(bus.occupancyOverride);
    const passengerCount = Math.min(bus.capacity, Math.round(bus.capacity * occupancyPercentage / 100));
    const occupancyLevel = occupancyLevelForPercentage(occupancyPercentage);
    const updatedAt = operationalStatus === "gps_lost"
      ? (bus.controlUpdatedAt ?? new Date(now - 120_000).toISOString())
      : new Date(now).toISOString();

    return [{
      id: bus.id,
      code: bus.code,
      lineId: bus.lineId,
      lineCode: line.code,
      lineColor: line.color,
      latitude,
      longitude,
      direction: outbound ? "outbound" : "inbound",
      nextStop: { ...nextStop, sequence: nextStopSequence },
      etaSeconds: operationalStatus === "in_service" && !simulation.paused
        ? Math.max(20, Math.round(remainingSeconds / Math.max(globalSpeed * Math.max(busSpeed, .25), .25)))
        : 0,
      occupancyPercentage,
      occupancyLevel,
      passengerCount,
      capacity: bus.capacity,
      updatedAt,
      operationalStatus,
      speedMultiplier: busSpeed,
      dataFreshness: operationalStatus === "gps_lost" ? "stale" : "live",
      source: "demo",
    }];
  });
}

export function signedTicketPayload(ticket: { id: string; publicCode: string; status: string; expiresAt: string | null }) {
  const body = `${ticket.id}|${ticket.publicCode}|${ticket.status}|${ticket.expiresAt ?? "none"}`;
  const secret = process.env.AUTH_SECRET ?? "development-only-secret";
  const signature = crypto.createHmac("sha256", secret).update(body).digest("hex").slice(0, 32);
  return `SMAP:${body}|${signature}`;
}
