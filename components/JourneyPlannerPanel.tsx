"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { jsonFetch } from "@/lib/client";
import { copy } from "@/lib/i18n";
import type { JourneyOption, Locale, NetworkResponse, Stop } from "@/lib/types";

export type PlannerPreset = { originStopId?: string; destinationStopId?: string };

export function JourneyPlannerPanel({
  network,
  locale,
  preset,
  onBuy,
}: {
  network: NetworkResponse;
  locale: Locale;
  preset?: PlannerPreset;
  onBuy: (journey: JourneyOption) => void;
}) {
  const t = copy[locale];
  const stops = useMemo(() => {
    const map = new Map<string, Stop>();
    for (const line of network.lines) for (const stop of line.stops) if (!map.has(stop.id)) map.set(stop.id, stop);
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [network.lines]);
  const [origin, setOrigin] = useState(preset?.originStopId ?? stops[0]?.id ?? "");
  const [destination, setDestination] = useState(preset?.destinationStopId ?? stops[1]?.id ?? "");
  const [journeys, setJourneys] = useState<JourneyOption[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (preset?.originStopId) setOrigin(preset.originStopId);
    if (preset?.destinationStopId) setDestination(preset.destinationStopId);
  }, [preset?.originStopId, preset?.destinationStopId]);

  const formatter = useMemo(() => new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-GB", { style: "currency", currency: "EUR" }), [locale]);
  const eta = (seconds: number | null) => seconds === null ? "—" : seconds < 60 ? t.arriving : `${Math.ceil(seconds / 60)} ${t.minutes}`;

  async function search() {
    setBusy(true); setError(""); setSearched(true);
    try {
      const data = await jsonFetch<{ journeys: JourneyOption[] }>("/api/journeys/plan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originStopId: origin, destinationStopId: destination, lang: locale }),
      });
      setJourneys(data.journeys);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); setJourneys([]); }
    finally { setBusy(false); }
  }

  return <div className="planner-layout">
    <section className="content-card planner-form-card">
      <div className="section-heading"><div><span className="status-pill">ROUTE</span><h2>{t.planJourney}</h2></div></div>
      <div className="form-grid">
        <label>{t.origin}<select value={origin} onChange={(e: ChangeEvent<HTMLSelectElement>) => setOrigin(e.target.value)}>{stops.map((stop) => <option key={stop.id} value={stop.id}>{stop.name} · {stop.code}</option>)}</select></label>
        <button className="swap-button" type="button" onClick={() => { setOrigin(destination); setDestination(origin); }} aria-label="Swap">⇅</button>
        <label>{t.destination}<select value={destination} onChange={(e: ChangeEvent<HTMLSelectElement>) => setDestination(e.target.value)}>{stops.map((stop) => <option key={stop.id} value={stop.id}>{stop.name} · {stop.code}</option>)}</select></label>
      </div>
      <button className="primary-button full-button" onClick={search} disabled={busy || !origin || !destination || origin === destination}>{busy ? "…" : t.findRoute}</button>
      {error && <p className="form-error">{error}</p>}
      <div className="service-card"><span>✓</span><div><strong>{t.serviceStatus}</strong><small>{t.normalService}</small></div></div>
      <p className="demo-disclaimer">{t.demoNotice}</p>
    </section>
    <section className="content-card">
      <div className="section-heading"><div><span className="status-pill">OPTIONS</span><h2>{t.directRoutes}</h2></div><p>{journeys.length}</p></div>
      {journeys.length ? <div className="journey-list">{journeys.map((journey) => <article className="journey-card" key={`${journey.lineId}-${journey.direction}`}>
        <div className="journey-header"><span className="line-badge" style={{ background: journey.lineColor }}>{journey.lineCode}</span><div><strong>{journey.lineName}</strong><span>{journey.originName} → {journey.destinationName}</span></div><b>{journey.durationMinutes} {t.minutes}</b></div>
        <div className="journey-metrics"><span><small>{t.stops}</small><strong>{journey.stopCount}</strong></span><span><small>{t.nextBus}</small><strong>{journey.nextBusCode ?? "—"} · {eta(journey.nextBusEtaSeconds)}</strong></span><span><small>{t.occupancy}</small><strong>{journey.occupancyLevel ? `${t[journey.occupancyLevel]} ${journey.occupancyPercentage}%` : "—"}</strong></span></div>
        <div className="fare-row">{journey.fares.map((fare) => <span key={fare.ticketType}><small>{t[fare.ticketType]}</small><strong>{formatter.format(fare.price)}</strong></span>)}</div>
        <button className="primary-button" onClick={() => onBuy(journey)}>{t.chooseJourney}</button>
      </article>)}</div> : searched ? <div className="empty-state">↔<strong>{t.noDirectRoute}</strong></div> : <div className="empty-state">⌖<strong>{t.findRoute}</strong><span>{t.origin} → {t.destination}</span></div>}
    </section>
  </div>;
}
