export function telemetryFreshness(recordedAt, maxAgeSeconds, now = Date.now()) {
  const timestamp = new Date(recordedAt).getTime();
  if (!Number.isFinite(timestamp)) return "stale";
  return Math.max(0, (now - timestamp) / 1000) <= maxAgeSeconds ? "live" : "stale";
}

export function chooseBusSource(mode, fallbackEnabled, demoBuses, externalBuses) {
  const freshExternal = externalBuses.filter((bus) => bus.dataFreshness === "live");
  if (mode === "demo") return { buses: demoBuses, active: "demo", fallbackActive: false };
  if (mode === "external") {
    if (freshExternal.length > 0) return { buses: externalBuses, active: "external", fallbackActive: false };
    if (fallbackEnabled) return { buses: demoBuses, active: "demo", fallbackActive: true };
    return { buses: externalBuses, active: "external", fallbackActive: false };
  }
  const coveredLines = new Set(freshExternal.map((bus) => bus.lineId));
  const demoFallback = fallbackEnabled ? demoBuses.filter((bus) => !coveredLines.has(bus.lineId)) : [];
  return {
    buses: [...externalBuses, ...demoFallback],
    active: freshExternal.length > 0 && demoFallback.length > 0 ? "mixed" : freshExternal.length > 0 ? "external" : "demo",
    fallbackActive: demoFallback.length > 0,
  };
}
