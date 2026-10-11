"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { jsonFetch } from "@/lib/client";
import type { AdminSystemResponse, Locale, RuntimeSettings } from "@/lib/types";

const text = {
  es: {
    title: "Sistema y publicación", subtitle: "Comprueba la preparación, comunica incidencias y registra despliegues.", refresh: "Actualizar",
    runChecks: "Ejecutar comprobaciones", settings: "Mantenimiento y estado público", save: "Guardar configuración", maintenance: "Modo mantenimiento",
    support: "Correo de soporte", titleEs: "Título en español", titleEn: "Título en inglés", messageEs: "Mensaje en español", messageEn: "Mensaje en inglés",
    publicEs: "Estado público en español", publicEn: "Estado público en inglés", health: "Salud del sistema", version: "Versión", deployment: "Despliegue", environment: "Entorno",
    database: "Base de datos", incidents: "Incidencias", newIncident: "Nueva incidencia", severity: "Severidad", info: "Información", warning: "Aviso", critical: "Crítica",
    create: "Crear incidencia", resolve: "Resolver", monitor: "En observación", open: "Abierta", resolved: "Resuelta", releases: "Versiones registradas",
    registerRelease: "Registrar versión", status: "Estado", prepared: "Preparada", deployed: "Desplegada", rolledBack: "Revertida", failed: "Fallida",
    commit: "Referencia Git", notes: "Notas", saved: "Guardado", error: "No se pudo completar la operación", checks: "Comprobaciones recientes", noData: "Sin datos todavía",
  },
  en: {
    title: "System and deployment", subtitle: "Check readiness, communicate incidents and record deployments.", refresh: "Refresh",
    runChecks: "Run checks", settings: "Maintenance and public status", save: "Save settings", maintenance: "Maintenance mode",
    support: "Support email", titleEs: "Spanish title", titleEn: "English title", messageEs: "Spanish message", messageEn: "English message",
    publicEs: "Spanish public status", publicEn: "English public status", health: "System health", version: "Version", deployment: "Deployment", environment: "Environment",
    database: "Database", incidents: "Incidents", newIncident: "New incident", severity: "Severity", info: "Information", warning: "Warning", critical: "Critical",
    create: "Create incident", resolve: "Resolve", monitor: "Monitoring", open: "Open", resolved: "Resolved", releases: "Recorded releases",
    registerRelease: "Record release", status: "Status", prepared: "Prepared", deployed: "Deployed", rolledBack: "Rolled back", failed: "Failed",
    commit: "Git reference", notes: "Notes", saved: "Saved", error: "The operation could not be completed", checks: "Recent checks", noData: "No data yet",
  },
} as const;

export function SystemPanel({ locale, onStatusChanged }: { locale: Locale; onStatusChanged: () => void }) {
  const t = text[locale];
  const [data, setData] = useState<AdminSystemResponse | null>(null);
  const [settings, setSettings] = useState<RuntimeSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [release, setRelease] = useState({ version: "1.0.0", deploymentId: "", environment: "local", status: "prepared", commitRef: "", notes: "" });
  const [incident, setIncident] = useState({ severity: "warning", titleEs: "", titleEn: "", bodyEs: "", bodyEn: "" });

  const load = useCallback(async () => {
    try {
      const result = await jsonFetch<AdminSystemResponse>(`/api/admin/system?lang=${locale}`);
      setData(result); setSettings(result.settings); setError("");
      setRelease((current) => current.deploymentId ? current : ({ ...current, deploymentId: result.status.deploymentId }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : t.error); }
  }, [locale, t.error]);
  useEffect(() => { void load(); }, [load]);

  async function perform(action: () => Promise<unknown>, success = t.saved) {
    setBusy(true); setMessage(""); setError("");
    try { await action(); setMessage(success); await load(); onStatusChanged(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t.error); }
    finally { setBusy(false); }
  }
  async function saveSettings() {
    if (!settings) return;
    await perform(() => jsonFetch("/api/admin/system/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) }));
  }
  async function createIncident() {
    await perform(() => jsonFetch("/api/admin/system/incidents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(incident) }));
    setIncident({ severity: "warning", titleEs: "", titleEn: "", bodyEs: "", bodyEn: "" });
  }
  async function updateIncident(id: string, status: "monitoring" | "resolved") {
    await perform(() => jsonFetch("/api/admin/system/incidents", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }));
  }
  async function registerRelease() {
    await perform(() => jsonFetch("/api/admin/system/releases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(release) }));
  }
  const date = (value: string | null) => value ? new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value)) : "—";

  return <div className="system-layout">
    <section className="content-card admin-intro"><span className="status-pill">OPS · RELEASE</span><h2>{t.title}</h2><p>{t.subtitle}</p><div className="admin-actions"><button className="secondary-button" onClick={() => void load()}>{t.refresh}</button><button className="primary-button" disabled={busy} onClick={() => void perform(() => jsonFetch("/api/admin/system/checks", { method: "POST" }))}>{t.runChecks}</button></div>{message && <p className="success-message" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}</section>

    <section className="operations-metrics">
      <article className="metric-card"><span>◉</span><strong>{data?.status.state ?? "—"}</strong><small>{t.health}</small></article>
      <article className="metric-card"><span>v</span><strong>{data?.status.version ?? "—"}</strong><small>{t.version}</small></article>
      <article className="metric-card"><span>↗</span><strong>{data?.status.deploymentId ?? "—"}</strong><small>{t.deployment}</small></article>
      <article className="metric-card"><span>DB</span><strong>{data?.status.databaseLatencyMs ?? "—"} ms</strong><small>{t.database}</small></article>
    </section>

    {settings && <section className="content-card"><div className="section-heading"><h2>{t.settings}</h2><button className="primary-button" disabled={busy} onClick={() => void saveSettings()}>{t.save}</button></div><div className="system-form-grid">
      <label className="admin-switch"><input type="checkbox" checked={settings.maintenanceMode} onChange={(event: ChangeEvent<HTMLInputElement>) => setSettings({ ...settings, maintenanceMode: event.target.checked })}/><span>{t.maintenance}</span></label>
      <label>{t.support}<input type="email" value={settings.supportEmail} onChange={(event: ChangeEvent<HTMLInputElement>) => setSettings({ ...settings, supportEmail: event.target.value })}/></label>
      <label>{t.titleEs}<input value={settings.maintenanceTitleEs} onChange={(event: ChangeEvent<HTMLInputElement>) => setSettings({ ...settings, maintenanceTitleEs: event.target.value })}/></label>
      <label>{t.titleEn}<input value={settings.maintenanceTitleEn} onChange={(event: ChangeEvent<HTMLInputElement>) => setSettings({ ...settings, maintenanceTitleEn: event.target.value })}/></label>
      <label>{t.messageEs}<textarea value={settings.maintenanceMessageEs} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setSettings({ ...settings, maintenanceMessageEs: event.target.value })}/></label>
      <label>{t.messageEn}<textarea value={settings.maintenanceMessageEn} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setSettings({ ...settings, maintenanceMessageEn: event.target.value })}/></label>
      <label>{t.publicEs}<textarea value={settings.publicStatusMessageEs} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setSettings({ ...settings, publicStatusMessageEs: event.target.value })}/></label>
      <label>{t.publicEn}<textarea value={settings.publicStatusMessageEn} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setSettings({ ...settings, publicStatusMessageEn: event.target.value })}/></label>
    </div></section>}

    <section className="content-card"><h2>{t.newIncident}</h2><div className="system-form-grid compact">
      <label>{t.severity}<select value={incident.severity} onChange={(event: ChangeEvent<HTMLSelectElement>) => setIncident({ ...incident, severity: event.target.value })}><option value="info">{t.info}</option><option value="warning">{t.warning}</option><option value="critical">{t.critical}</option></select></label>
      <label>{t.titleEs}<input value={incident.titleEs} onChange={(event: ChangeEvent<HTMLInputElement>) => setIncident({ ...incident, titleEs: event.target.value })}/></label>
      <label>{t.titleEn}<input value={incident.titleEn} onChange={(event: ChangeEvent<HTMLInputElement>) => setIncident({ ...incident, titleEn: event.target.value })}/></label>
      <label>{t.messageEs}<textarea value={incident.bodyEs} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setIncident({ ...incident, bodyEs: event.target.value })}/></label>
      <label>{t.messageEn}<textarea value={incident.bodyEn} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setIncident({ ...incident, bodyEn: event.target.value })}/></label>
    </div><button className="primary-button" disabled={busy} onClick={() => void createIncident()}>{t.create}</button></section>

    <section className="content-card"><h2>{t.incidents}</h2>{!data?.incidents.length ? <p>{t.noData}</p> : <div className="incident-grid">{data.incidents.map((item) => <article className={`incident-card ${item.severity}`} key={item.id}><header><strong>{locale === "en" ? item.titleEn : item.titleEs}</strong><span>{item.status}</span></header><p>{locale === "en" ? item.bodyEn : item.bodyEs}</p><small>{date(item.startsAt)}</small>{item.status !== "resolved" && <div className="admin-actions"><button className="secondary-button" disabled={busy} onClick={() => void updateIncident(item.id, "monitoring")}>{t.monitor}</button><button className="primary-button" disabled={busy} onClick={() => void updateIncident(item.id, "resolved")}>{t.resolve}</button></div>}</article>)}</div>}</section>

    <section className="content-card"><h2>{t.registerRelease}</h2><div className="release-form">
      <label>{t.version}<input value={release.version} onChange={(event: ChangeEvent<HTMLInputElement>) => setRelease({ ...release, version: event.target.value })}/></label>
      <label>{t.deployment}<input value={release.deploymentId} onChange={(event: ChangeEvent<HTMLInputElement>) => setRelease({ ...release, deploymentId: event.target.value })}/></label>
      <label>{t.environment}<select value={release.environment} onChange={(event: ChangeEvent<HTMLSelectElement>) => setRelease({ ...release, environment: event.target.value })}><option value="local">local</option><option value="staging">staging</option><option value="production">production</option></select></label>
      <label>{t.status}<select value={release.status} onChange={(event: ChangeEvent<HTMLSelectElement>) => setRelease({ ...release, status: event.target.value })}><option value="prepared">{t.prepared}</option><option value="deployed">{t.deployed}</option><option value="rolled_back">{t.rolledBack}</option><option value="failed">{t.failed}</option></select></label>
      <label>{t.commit}<input value={release.commitRef} onChange={(event: ChangeEvent<HTMLInputElement>) => setRelease({ ...release, commitRef: event.target.value })}/></label>
      <label>{t.notes}<input value={release.notes} onChange={(event: ChangeEvent<HTMLInputElement>) => setRelease({ ...release, notes: event.target.value })}/></label>
    </div><button className="primary-button" disabled={busy} onClick={() => void registerRelease()}>{t.registerRelease}</button></section>

    <section className="content-card"><h2>{t.releases}</h2>{!data?.releases.length ? <p>{t.noData}</p> : <div className="table-scroll"><table className="audit-table"><thead><tr><th>{t.version}</th><th>{t.deployment}</th><th>{t.environment}</th><th>{t.status}</th><th>{t.notes}</th></tr></thead><tbody>{data.releases.map((item) => <tr key={item.id}><td>{item.version}</td><td><code>{item.deploymentId}</code><small className="table-message">{date(item.createdAt)}</small></td><td>{item.environment}</td><td><code>{item.status}</code></td><td>{item.notes ?? "—"}</td></tr>)}</tbody></table></div>}</section>

    <section className="content-card"><h2>{t.checks}</h2>{!data?.checks.length ? <p>{t.noData}</p> : <div className="check-grid">{data.checks.slice(0, 12).map((item) => <article className={`check-card ${item.status}`} key={item.id}><strong>{item.name}</strong><span>{item.status}</span><small>{item.latencyMs == null ? date(item.checkedAt) : `${item.latencyMs} ms · ${date(item.checkedAt)}`}</small></article>)}</div>}</section>
  </div>;
}
