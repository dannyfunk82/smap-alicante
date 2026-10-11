import { db } from "@/lib/db";
import { aggregateHealth, maintenanceState } from "@/lib/release-policy.js";
import type { PublicSystemStatus } from "@/lib/types";

export const APP_VERSION = "1.0.0";
export const DEPLOYMENT_ID = process.env.NEXT_DEPLOYMENT_ID || process.env.SMAP_RELEASE || `local-${APP_VERSION}`;
export const APP_ENVIRONMENT = ["local", "staging", "production"].includes(String(process.env.SMAP_ENVIRONMENT)) ? String(process.env.SMAP_ENVIRONMENT) : "local";

type IncidentRow = { id: string; severity: "info" | "warning" | "critical"; status: "open" | "monitoring"; title_es: string; title_en: string; body_es: string; body_en: string; starts_at: Date | string; resolved_at: Date | string | null };
type CheckRow = { check_name: string; status: "ok" | "warning" | "error"; latency_ms: number | string | null; details: Record<string, unknown> | null; checked_at: Date | string };

export async function publicSystemStatus(locale: "es" | "en" = "es"): Promise<PublicSystemStatus> {
  const started = performance.now();
  let databaseStatus: "connected" | "unavailable" = "connected";
  try { await db.query("SELECT 1"); } catch { databaseStatus = "unavailable"; }
  const databaseLatencyMs = Math.round(performance.now() - started);
  const [settingsResult, incidentsResult, checksResult] = await Promise.all([
    db.query("SELECT * FROM runtime_settings WHERE id=1").catch(() => ({ rows: [] })),
    db.query(`SELECT id,severity,status,title_es,title_en,body_es,body_en,starts_at,resolved_at
      FROM service_incidents WHERE status <> 'resolved' ORDER BY starts_at DESC LIMIT 10`).catch(() => ({ rows: [] })),
    db.query(`SELECT DISTINCT ON (check_name) check_name,status,latency_ms,details,checked_at
      FROM system_checks ORDER BY check_name,checked_at DESC`).catch(() => ({ rows: [] })),
  ]);
  const settings = settingsResult.rows[0] ?? {};
  const incidents = (incidentsResult.rows as IncidentRow[]).map((row) => ({
    id: row.id, severity: row.severity, status: row.status,
    title: locale === "en" ? row.title_en : row.title_es,
    body: locale === "en" ? row.body_en : row.body_es,
    startsAt: new Date(row.starts_at).toISOString(), resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : null,
  }));
  const checks = (checksResult.rows as CheckRow[]).map((row) => ({
    name: row.check_name, status: row.status, latencyMs: row.latency_ms == null ? null : Number(row.latency_ms),
    details: row.details ?? {}, checkedAt: new Date(row.checked_at).toISOString(),
  }));
  const critical = incidents.filter((incident) => incident.severity === "critical").length;
  return {
    service: "smap-web", version: APP_VERSION, deploymentId: DEPLOYMENT_ID, environment: APP_ENVIRONMENT,
    state: databaseStatus === "unavailable" ? "unavailable" : maintenanceState(Boolean(settings.maintenance_mode), critical),
    database: databaseStatus, databaseLatencyMs,
    maintenance: {
      enabled: Boolean(settings.maintenance_mode),
      title: locale === "en" ? settings.maintenance_title_en : settings.maintenance_title_es,
      message: locale === "en" ? settings.maintenance_message_en : settings.maintenance_message_es,
    },
    message: locale === "en" ? settings.public_status_message_en : settings.public_status_message_es,
    supportEmail: settings.support_email ?? null,
    incidents, checks, checksStatus: aggregateHealth(checks), timestamp: new Date().toISOString(),
  };
}
