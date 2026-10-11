"use client";

import { useCallback, useEffect, useState } from "react";
import { jsonFetch } from "@/lib/client";
import type { Locale, OperationsResponse } from "@/lib/types";

const labels = {
  es: {
    title: "Operaciones y seguridad", subtitle: "Métricas, accesos y trazabilidad de las acciones críticas.",
    users: "Usuarios", active: "Activos 24 h", failed: "Accesos fallidos", locked: "Cuentas bloqueadas",
    tickets: "Billetes 24 h", events: "Eventos auditados", audit: "Registro de auditoría", export: "Exportar CSV",
    actor: "Actor", action: "Acción", entity: "Entidad", ip: "IP", date: "Fecha", empty: "No hay eventos registrados.", refresh: "Actualizar",
  },
  en: {
    title: "Operations and security", subtitle: "Metrics, access activity and traceability for critical actions.",
    users: "Users", active: "Active 24 h", failed: "Failed sign-ins", locked: "Locked accounts",
    tickets: "Tickets 24 h", events: "Audited events", audit: "Audit log", export: "Export CSV",
    actor: "Actor", action: "Action", entity: "Entity", ip: "IP", date: "Date", empty: "No events recorded.", refresh: "Refresh",
  },
} as const;

export function OperationsPanel({ locale }: { locale: Locale }) {
  const t = labels[locale];
  const [data, setData] = useState<OperationsResponse | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { setData(await jsonFetch<OperationsResponse>("/api/admin/operations")); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Error"); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <div className="operations-layout">
    <section className="content-card admin-intro"><span className="status-pill">SECURITY</span><h2>{t.title}</h2><p>{t.subtitle}</p>{error && <p className="form-error" role="alert">{error}</p>}</section>
    {data && <>
      <section className="operations-metrics" aria-label={t.title}>
        {[[t.users,data.metrics.users],[t.active,data.metrics.activeUsers24h],[t.failed,data.metrics.failedLogins24h],[t.locked,data.metrics.lockedAccounts],[t.tickets,data.metrics.tickets24h],[t.events,data.metrics.auditEvents24h]].map(([label,value]) => <article className="metric-card" key={String(label)}><span>{label}</span><strong>{value}</strong></article>)}
      </section>
      <section className="content-card"><div className="section-heading"><div><h2>{t.audit}</h2></div><div className="admin-actions"><button className="secondary-button" onClick={() => void load()}>{t.refresh}</button><a className="primary-button button-link" href="/api/admin/operations/export">{t.export}</a></div></div>
        {data.auditLogs.length === 0 ? <p>{t.empty}</p> : <div className="table-scroll"><table className="audit-table"><thead><tr><th>{t.date}</th><th>{t.actor}</th><th>{t.action}</th><th>{t.entity}</th><th>{t.ip}</th></tr></thead><tbody>{data.auditLogs.map((item) => <tr key={item.id}><td>{new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { dateStyle: "short", timeStyle: "medium" }).format(new Date(item.createdAt))}</td><td>{item.actorEmail ?? "—"}</td><td><code>{item.action}</code></td><td>{[item.entityType,item.entityId].filter(Boolean).join(" · ") || "—"}</td><td>{item.ipAddress ?? "—"}</td></tr>)}</tbody></table></div>}
      </section>
    </>}
  </div>;
}
