"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { copy } from "@/lib/i18n";
import type { Locale, NetworkResponse, ScheduledDeparture, Stop } from "@/lib/types";

const SEGMENT_SECONDS = 28;

export function StopDetailPanel({
  network,
  stop,
  locale,
  onFavorite,
  onPlanFrom,
  onPlanTo,
  onClose,
}: {
  network: NetworkResponse;
  stop: Stop;
  locale: Locale;
  onFavorite: (type: "line" | "stop", entityId: string) => Promise<void>;
  onPlanFrom: (stop: Stop) => void;
  onPlanTo: (stop: Stop) => void;
  onClose: () => void;
}) {
  const t = copy[locale];
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [scheduled, setScheduled] = useState<ScheduledDeparture[]>([]);
  const lines = network.lines.filter((line) => line.stops.some((item) => item.id === stop.id));
  const arrivals = useMemo(() => {
    if (network.simulation.paused) return [];
    return lines.flatMap((line) => {
      const target = line.stops.find((item) => item.id === stop.id);
      if (!target) return [];
      return network.buses.filter((bus) => bus.lineId === line.id && bus.operationalStatus === "in_service" && bus.dataFreshness === "live").flatMap((bus) => {
        const approaching = bus.direction === "outbound" ? target.sequence >= bus.nextStop.sequence : target.sequence <= bus.nextStop.sequence;
        if (!approaching) return [];
        return [{ bus, etaSeconds: bus.etaSeconds + Math.abs(target.sequence - bus.nextStop.sequence) * SEGMENT_SECONDS }];
      });
    }).sort((a, b) => a.etaSeconds - b.etaSeconds).slice(0, 6);
  }, [lines, network.buses, network.simulation.paused, stop.id]);
  const eta = (seconds: number) => seconds < 60 ? t.arriving : `${Math.ceil(seconds / 60)} ${t.minutes}`;


  useEffect(() => {
    let active = true;
    fetch(`/api/stops/${encodeURIComponent(stop.id)}?lang=${locale}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("schedule")))
      .then((data) => { if (active) setScheduled(Array.isArray(data.scheduledDepartures) ? data.scheduledDepartures : []); })
      .catch(() => { if (active) setScheduled([]); });
    return () => { active = false; };
  }, [stop.id, locale]);
  useEffect(() => {
    closeRef.current?.focus();
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose]);

  return <div className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="stop-detail-title">
    <button ref={closeRef} className="modal-close" onClick={onClose} aria-label={t.close}>×</button>
    <span className="status-pill">🚏 {stop.code}</span>
    <h2 id="stop-detail-title">{stop.name}</h2>
    <p>{stop.accessible ? `♿ ${t.accessible}` : ""}</p>
    <div className="line-chip-list">{lines.map((line) => <span key={line.id} className="line-badge" style={{ background: line.color }}>{line.code}</span>)}</div>
    <div className="drawer-actions">
      <button className="secondary-button compact" onClick={() => onFavorite("stop", stop.id)}>☆ {t.addFavorite}</button>
      <button className="secondary-button compact" onClick={() => onPlanFrom(stop)}>{t.origin}</button>
      <button className="primary-button compact" onClick={() => onPlanTo(stop)}>{t.destination}</button>
    </div>
    {scheduled.length ? <>
      <h3>{locale === "es" ? "Horario programado (GTFS real)" : "Scheduled timetable (real GTFS)"}</h3>
      <p className="data-source-note">{locale === "es" ? "Horarios oficiales programados. Las posiciones y la ocupación siguen siendo simuladas." : "Official scheduled times. Vehicle positions and occupancy remain simulated."}</p>
      <div className="arrival-list stop-arrivals">{scheduled.map((item, index) => <article className="arrival-row static" key={`${item.lineId}-${item.scheduledTime}-${index}`}>
        <span className="line-badge" style={{ background: item.lineColor }}>{item.lineCode}</span>
        <div><strong>{item.headsign || item.lineName}</strong><span>{item.lineName}</span></div>
        <b>{item.scheduledTime}<small className="scheduled-minutes">{item.minutesFromNow} min</small></b>
      </article>)}</div>
    </> : null}
    <h3>{network.staticData.kind === "gtfs" ? (locale === "es" ? "Vehículos simulados sobre la red real" : "Simulated vehicles on the real network") : t.departures}</h3>
    {arrivals.length ? <div className="arrival-list stop-arrivals">{arrivals.map(({ bus, etaSeconds }) => <article className="arrival-row static" key={bus.id}>
      <span className="line-badge" style={{ background: bus.lineColor }}>{bus.lineCode}</span>
      <div><strong>{bus.code}</strong><span>{t.occupancy}: {t[bus.occupancyLevel]} {bus.occupancyPercentage}%</span></div>
      <b>{eta(etaSeconds)}</b>
    </article>)}</div> : <div className="compact-empty">{t.noArrivals}</div>}
  </div>;
}
