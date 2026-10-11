import Link from "next/link";
import { publicSystemStatus } from "@/lib/system";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const status = await publicSystemStatus("es");
  return <main id="main-content" className="status-page">
    <header className="status-page-header"><div><span className="brand-mark small">S</span><div><strong>SMAP</strong><small>Smart Mobility Alicante Platform</small></div></div><Link href="/login">Entrar</Link></header>
    <section className={`status-hero ${status.state}`}><p className="eyebrow">Estado público</p><h1>{status.state === "operational" ? "Todos los sistemas operativos" : status.state === "maintenance" ? status.maintenance.title : status.state === "degraded" ? "Servicio con incidencias" : "Servicio no disponible"}</h1><p>{status.maintenance.enabled ? status.maintenance.message : status.message || "Información actualizada automáticamente."}</p><dl><div><dt>Versión</dt><dd>{status.version}</dd></div><div><dt>Despliegue</dt><dd>{status.deploymentId}</dd></div><div><dt>Entorno</dt><dd>{status.environment}</dd></div><div><dt>Base de datos</dt><dd>{status.database} · {status.databaseLatencyMs} ms</dd></div></dl></section>
    <section className="status-page-grid"><article className="content-card"><h2>Incidencias activas</h2>{status.incidents.length === 0 ? <p>No hay incidencias activas.</p> : status.incidents.map((incident) => <div className={`public-incident ${incident.severity}`} key={incident.id}><strong>{incident.title}</strong><p>{incident.body}</p><small>{new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" }).format(new Date(incident.startsAt))}</small></div>)}</article><article className="content-card"><h2>Comprobaciones</h2>{status.checks.length === 0 ? <p>Aún no se han ejecutado comprobaciones.</p> : status.checks.map((check) => <div className={`public-check ${check.status}`} key={check.name}><span>{check.name}</span><strong>{check.status}</strong><small>{check.latencyMs == null ? "—" : `${check.latencyMs} ms`}</small></div>)}</article></section>
    <footer className="status-footer">Última actualización: {new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(status.timestamp))}{status.supportEmail ? <> · Soporte: <a href={`mailto:${status.supportEmail}`}>{status.supportEmail}</a></> : null}</footer>
  </main>;
}
