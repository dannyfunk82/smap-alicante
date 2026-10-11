"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BusLive, Locale, NetworkResponse, Stop } from "@/lib/types";
import { copy } from "@/lib/i18n";

declare global {
  interface Window {
    google?: { maps: {
      Map: new (element: HTMLElement, options: Record<string, unknown>) => { fitBounds: (bounds: unknown) => void };
      Marker: new (options: Record<string, unknown>) => { addListener: (event: string, handler: () => void) => void };
      Polyline: new (options: Record<string, unknown>) => unknown;
      LatLngBounds: new () => { extend: (point: { lat: number; lng: number }) => void };
    }};
  }
}

export function MapPanel({
  network,
  locale,
  lineFilter,
  onSelectBus,
  onSelectStop,
}: {
  network: NetworkResponse;
  locale: Locale;
  lineFilter: string;
  onSelectBus: (bus: BusLive) => void;
  onSelectStop: (stop: Stop) => void;
}) {
  const container = useRef<HTMLDivElement | null>(null);
  const [key, setKey] = useState("");
  const [ready, setReady] = useState(false);
  const t = copy[locale];
  const visibleLines = useMemo(() => lineFilter === "all" ? network.lines : network.lines.filter((line) => line.id === lineFilter), [network.lines, lineFilter]);
  const visibleBuses = useMemo(() => lineFilter === "all" ? network.buses : network.buses.filter((bus) => bus.lineId === lineFilter), [network.buses, lineFilter]);

  useEffect(() => { fetch("/api/config").then((r) => r.json()).then((data) => setKey(data.googleMapsBrowserKey ?? "")).catch(() => setKey("")); }, []);
  useEffect(() => {
    if (!key) return;
    if (window.google?.maps) { setReady(true); return; }
    const existing = document.querySelector<HTMLScriptElement>('script[data-smap-google-maps="true"]');
    if (existing) { existing.addEventListener("load", () => setReady(true), { once: true }); return; }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
    script.async = true;
    script.dataset.smapGoogleMaps = "true";
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, [key]);

  useEffect(() => {
    if (!ready || !container.current || !window.google?.maps) return;
    const maps = window.google.maps;
    const map = new maps.Map(container.current, { center: { lat: 38.3452, lng: -0.4810 }, zoom: 13, mapTypeControl: false, streetViewControl: false, fullscreenControl: true });
    const bounds = new maps.LatLngBounds();
    for (const line of visibleLines) {
      const path = line.stops.map((stop) => ({ lat: stop.latitude, lng: stop.longitude }));
      new maps.Polyline({ path, map, strokeColor: line.color, strokeOpacity: 0.82, strokeWeight: 5 });
      for (const stop of line.stops) {
        const position = { lat: stop.latitude, lng: stop.longitude };
        bounds.extend(position);
        const marker = new maps.Marker({ position, map, title: `${line.code} · ${stop.name}` });
        marker.addListener("click", () => onSelectStop(stop));
      }
    }
    for (const bus of visibleBuses) {
      const position = { lat: bus.latitude, lng: bus.longitude };
      bounds.extend(position);
      const marker = new maps.Marker({ position, map, title: `${bus.code} · ${bus.operationalStatus}`, label: { text: bus.operationalStatus === "in_service" ? "🚌" : bus.operationalStatus === "gps_lost" ? "?" : "!", fontSize: "20px" } });
      marker.addListener("click", () => onSelectBus(bus));
    }
    map.fitBounds(bounds);
  }, [ready, visibleLines, visibleBuses, onSelectBus, onSelectStop]);

  const allPoints = useMemo(() => [
    ...visibleLines.flatMap((line) => line.stops.map((stop) => ({ id: `${line.id}-${stop.id}`, latitude: stop.latitude, longitude: stop.longitude, color: line.color, title: `${line.code} · ${stop.name}`, kind: "stop" as const, stop }))),
    ...visibleBuses.map((bus) => ({ id: bus.id, latitude: bus.latitude, longitude: bus.longitude, color: bus.lineColor, title: `${bus.code} · ${bus.nextStop.name}`, kind: "bus" as const, bus })),
  ], [visibleLines, visibleBuses]);
  const lats = allPoints.map((point) => point.latitude), lngs = allPoints.map((point) => point.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

  if (key) return <div ref={container} className="google-map" aria-label={t.map} />;
  return <div className="fallback-map" role="region" aria-label={t.mapFallback}>
    <div className="fallback-grid" /><span className="alicante-label">ALICANTE</span>
    {allPoints.map((point) => {
      const left = 8 + ((point.longitude - minLng) / Math.max(maxLng - minLng, .0001)) * 84;
      const top = 8 + (1 - (point.latitude - minLat) / Math.max(maxLat - minLat, .0001)) * 84;
      if (point.kind === "bus") return <button key={point.id} className={`bus-map-marker ${point.bus.operationalStatus} ${point.bus.source === "external" ? "external" : "demo"}`} title={`${point.title} · ${point.bus.operationalStatus}`} aria-label={`${point.title} · ${point.bus.operationalStatus}`} onClick={() => onSelectBus(point.bus)} style={{ left: `${left}%`, top: `${top}%`, borderColor: point.color }}>{point.bus.operationalStatus === "in_service" ? "🚌" : point.bus.operationalStatus === "gps_lost" ? "?" : "!"}</button>;
      return <button key={point.id} className="stop-map-marker" title={point.title} aria-label={point.title} onClick={() => onSelectStop(point.stop)} style={{ left: `${left}%`, top: `${top}%`, background: point.color }} />;
    })}
    <div className="fallback-note">{t.mapFallback}</div>
  </div>;
}
