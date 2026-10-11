import type { BusLive, IntegrationMode } from "./types";
export function telemetryFreshness(recordedAt: string | Date, maxAgeSeconds: number, now?: number): "live" | "stale";
export function chooseBusSource(mode: IntegrationMode, fallbackEnabled: boolean, demoBuses: BusLive[], externalBuses: BusLive[]): {
  buses: BusLive[];
  active: "demo" | "external" | "mixed";
  fallbackActive: boolean;
};
