"use client";
import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";
import { copy } from "@/lib/i18n";
import type { Locale, NetworkResponse, Stop } from "@/lib/types";

export function SearchPanel({
  network,
  locale,
  onFavorite,
  onOpenStop,
  onPlanTo,
}: {
  network: NetworkResponse;
  locale: Locale;
  onFavorite: (type: "line" | "stop", entityId: string) => Promise<void>;
  onOpenStop: (stop: Stop) => void;
  onPlanTo: (stop: Stop) => void;
}) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const t = copy[locale];
  const normalized = query.trim().toLocaleLowerCase();
  const results = useMemo(() => {
    if (!normalized) return [];
    const lines = network.lines.filter((line) => `${line.code} ${line.name}`.toLocaleLowerCase().includes(normalized)).map((line) => ({ type: "line" as const, id: line.id, title: `${line.code} · ${line.name}`, subtitle: `${line.stops.length} ${t.stops}`, color: line.color, stop: undefined }));
    const stops = network.lines.flatMap((line) => line.stops.map((stop) => ({ type: "stop" as const, id: stop.id, title: stop.name, subtitle: `${stop.code} · ${line.code}${stop.accessible ? ` · ${t.accessible}` : ""}`, color: line.color, stop }))).filter((item, index, array) => `${item.title} ${item.subtitle}`.toLocaleLowerCase().includes(normalized) && array.findIndex((candidate) => candidate.id === item.id) === index);
    return [...lines, ...stops].slice(0, 30);
  }, [network.lines, normalized, t]);
  async function add(type: "line" | "stop", id: string) { try { await onFavorite(type, id); setMessage(t.addFavorite); } catch (e) { setMessage(e instanceof Error ? e.message : "Error"); } }
  return <section className="content-card">
    <div className="section-heading"><div><span className="status-pill">SEARCH</span><h2>{t.search}</h2></div><p>{network.stopCount} {t.stops} · {network.lines.length} {t.lines.toLocaleLowerCase()}</p></div>
    <label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} placeholder={t.searchPlaceholder} autoFocus /></label>
    {message && <p className="inline-message" role="status">{message}</p>}
    {!query ? <div className="empty-state"><strong>{t.searchPlaceholder}</strong><span>L1, L2, L3, ALC-L1-01…</span></div> : results.length ? <div className="result-list">{results.map((result) => <article className="result-row" key={`${result.type}-${result.id}`}>
      <button className="result-icon" style={{ borderColor: result.color }} onClick={() => result.stop && onOpenStop(result.stop)} aria-label={result.title}>{result.type === "line" ? "🚌" : "🚏"}</button>
      <div><strong>{result.title}</strong><span>{result.subtitle}</span></div>
      <div className="result-actions">{result.stop && <button className="secondary-button compact" onClick={() => onPlanTo(result.stop!)}>⌖ {t.planJourney}</button>}<button className="secondary-button compact" onClick={() => add(result.type, result.id)}>☆ {t.addFavorite}</button></div>
    </article>)}</div> : <div className="empty-state">{t.noResults}</div>}
  </section>;
}
