"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { jsonFetch } from "@/lib/client";
import type { IntegrationMode, IntegrationStatus, Locale } from "@/lib/types";

const labels = {
  es: {
    title: "Integraciones de datos", subtitle: "Prepara SMAP para GTFS y telemetría externa, manteniendo un fallback seguro sobre la simulación.",
    mode: "Modo de datos", demo: "Solo demo", hybrid: "Híbrido", external: "Solo externo", fallback: "Fallback automático", maxAge: "Antigüedad máxima", seconds: "segundos",
    source: "Fuente activa", save: "Guardar configuración", saved: "Configuración guardada", test: "Generar telemetría de prueba", clear: "Borrar telemetría externa",
    sources: "Fuentes configuradas", syncs: "Últimas sincronizaciones", status: "Estado", staticSync: "GTFS", realtime: "Tiempo real", lastUpdate: "Última actualización",
    vehicles: "Vehículos recibidos", noRuns: "Todavía no hay sincronizaciones.", command: "Importar la red urbana real de Alicante", simulator: "Enviar telemetría externa de prueba",
    records: "registros", activeSource: "Fuente activa", disabled: "Desactivada", enabled: "Activa", refresh: "Actualizar", error: "No se pudo completar la operación.",
  },
  en: {
    title: "Data integrations", subtitle: "Prepare SMAP for GTFS and external telemetry while retaining a safe simulation fallback.",
    mode: "Data mode", demo: "Demo only", hybrid: "Hybrid", external: "External only", fallback: "Automatic fallback", maxAge: "Maximum age", seconds: "seconds",
    source: "Active source", save: "Save configuration", saved: "Configuration saved", test: "Generate test telemetry", clear: "Clear external telemetry",
    sources: "Configured sources", syncs: "Recent syncs", status: "Status", staticSync: "GTFS", realtime: "Realtime", lastUpdate: "Last update",
    vehicles: "Received vehicles", noRuns: "No synchronisations yet.", command: "Import the real Alicante urban network", simulator: "Send test external telemetry",
    records: "records", activeSource: "Active source", disabled: "Disabled", enabled: "Enabled", refresh: "Refresh", error: "The operation could not be completed.",
  },
} as const;

export function IntegrationsPanel({ locale, onChanged }: { locale: Locale; onChanged: () => void }) {
  const t = labels[locale];
  const [data, setData] = useState<IntegrationStatus | null>(null);
  const [mode, setMode] = useState<IntegrationMode>("demo");
  const [fallbackEnabled, setFallbackEnabled] = useState(true);
  const [maxAgeSeconds, setMaxAgeSeconds] = useState(45);
  const [activeSourceId, setActiveSourceId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await jsonFetch<IntegrationStatus>("/api/admin/integrations");
      setData(result); setMode(result.settings.mode); setFallbackEnabled(result.settings.fallbackEnabled);
      setMaxAgeSeconds(result.settings.maxAgeSeconds); setActiveSourceId(result.settings.activeSourceId ?? ""); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : t.error); }
  }, [t.error]);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    setBusy(true); setMessage(""); setError("");
    try {
      await jsonFetch("/api/admin/integrations/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, fallbackEnabled, maxAgeSeconds, activeSourceId: activeSourceId || null }) });
      setMessage(t.saved); await load(); onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : t.error); }
    finally { setBusy(false); }
  }
  async function action(path: string) {
    setBusy(true); setMessage(""); setError("");
    try { await jsonFetch(path, { method: "POST" }); await load(); onChanged(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t.error); }
    finally { setBusy(false); }
  }
  const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value)) : "—";
  return <div className="integration-layout">
    <section className="content-card admin-intro"><span className="status-pill">GTFS · API</span><h2>{t.title}</h2><p>{t.subtitle}</p>{message && <p className="success-message" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}</section>
    <section className="content-card"><div className="section-heading"><div><h2>{t.mode}</h2></div><button className="secondary-button" onClick={() => void load()}>{t.refresh}</button></div>
      <div className="integration-settings">
        <label>{t.mode}<select value={mode} onChange={(event: ChangeEvent<HTMLSelectElement>) => setMode(event.target.value as IntegrationMode)}><option value="demo">{t.demo}</option><option value="hybrid">{t.hybrid}</option><option value="external">{t.external}</option></select></label>
        <label>{t.source}<select value={activeSourceId} onChange={(event: ChangeEvent<HTMLSelectElement>) => setActiveSourceId(event.target.value)}><option value="">—</option>{data?.sources.map((source) => <option key={source.id} value={source.id}>{source.name} ({source.code})</option>)}</select></label>
        <label>{t.maxAge}<div className="input-suffix"><input type="number" min={10} max={600} value={maxAgeSeconds} onChange={(event: ChangeEvent<HTMLInputElement>) => setMaxAgeSeconds(Number(event.target.value))}/><span>{t.seconds}</span></div></label>
        <label className="admin-switch"><input type="checkbox" checked={fallbackEnabled} onChange={(event: ChangeEvent<HTMLInputElement>) => setFallbackEnabled(event.target.checked)}/><span>{t.fallback}</span></label>
        <button className="primary-button" disabled={busy} onClick={() => void save()}>{t.save}</button>
      </div>
    </section>
    <section className="operations-metrics">
      <article className="metric-card"><span>↯</span><strong>{data?.telemetry.vehicleCount ?? 0}</strong><small>{t.vehicles}</small></article>
      <article className="metric-card"><span>◷</span><strong>{formatDate(data?.telemetry.lastUpdate ?? null)}</strong><small>{t.lastUpdate}</small></article>
      <article className="metric-card"><span>◎</span><strong>{data?.settings.mode ?? "demo"}</strong><small>{t.mode}</small></article>
    </section>
    <section className="content-card"><div className="section-heading"><h2>{t.sources}</h2><div className="admin-actions"><button className="secondary-button" disabled={busy} onClick={() => void action("/api/admin/integrations/test")}>{t.test}</button><button className="danger-button" disabled={busy} onClick={() => void action("/api/admin/integrations/telemetry/clear")}>{t.clear}</button></div></div>
      <div className="integration-source-grid">{data?.sources.map((source) => <article className="integration-source-card" key={source.id}><header><strong>{source.name}</strong><span className={`source-status ${source.status}`}>{source.status}</span></header><code>{source.code}</code><dl><div><dt>{t.status}</dt><dd>{source.enabled ? t.enabled : t.disabled}</dd></div><div><dt>{t.staticSync}</dt><dd>{formatDate(source.lastStaticSyncAt)}</dd></div><div><dt>{t.realtime}</dt><dd>{formatDate(source.lastRealtimeAt)}</dd></div></dl>{source.lastError && <p className="form-error">{source.lastError}</p>}</article>)}</div>
    </section>
    <section className="content-card"><h2>{t.command}</h2><p>{locale === "es" ? "Descarga el GTFS oficial mediante Transitland o selecciona un ZIP descargado del NAP. La importación carga líneas, paradas, recorridos y horarios programados reales." : "Download the official GTFS through Transitland or select a ZIP downloaded from NAP. The import loads real routes, stops, route patterns and scheduled times."}</p><pre className="command-block"><code>windows\IMPORT_ALICANTE_GTFS.cmd</code></pre><pre className="command-block"><code>{`npm.cmd run alicante:import -- --dir C:\datos\alicante_gtfs`}</code></pre><p className="data-source-note">Powered by MITRAMS · https://www.transportes.gob.es/</p><h3>{t.simulator}</h3><pre className="command-block"><code>npm.cmd run telemetry:simulate</code></pre></section>
    <section className="content-card"><h2>{t.syncs}</h2>{!data?.recentRuns.length ? <p>{t.noRuns}</p> : <div className="table-scroll"><table className="audit-table"><thead><tr><th>{t.lastUpdate}</th><th>{t.source}</th><th>{t.status}</th><th>{t.records}</th></tr></thead><tbody>{data.recentRuns.map((run) => <tr key={run.id}><td>{formatDate(run.startedAt)}</td><td>{run.sourceCode ?? "—"} · {run.syncType}</td><td><code>{run.status}</code></td><td>{run.recordsApplied}/{run.recordsReceived}{run.message ? <small className="table-message">{run.message}</small> : null}</td></tr>)}</tbody></table></div>}</section>
  </div>;
}
