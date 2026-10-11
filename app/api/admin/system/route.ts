import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { publicSystemStatus } from "@/lib/system";

export const dynamic = "force-dynamic";

type ReleaseRow = { id: number | string; version: string; deployment_id: string; environment: "local" | "staging" | "production"; status: "prepared" | "deployed" | "rolled_back" | "failed"; commit_ref: string | null; notes: string | null; created_at: Date | string; deployed_at: Date | string | null };
type IncidentRow = { id: string; severity: "info" | "warning" | "critical"; status: "open" | "monitoring" | "resolved"; title_es: string; title_en: string; body_es: string; body_en: string; starts_at: Date | string; resolved_at: Date | string | null; updated_at: Date | string };
type CheckRow = { id: number | string; check_name: string; status: "ok" | "warning" | "error"; latency_ms: number | string | null; details: Record<string, unknown> | null; checked_at: Date | string };

export async function GET(request: Request) {
  if (!await currentAdminSession()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const locale = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "es";
  const [status, settings, releases, incidents, checks] = await Promise.all([
    publicSystemStatus(locale),
    db.query("SELECT * FROM runtime_settings WHERE id=1"),
    db.query(`SELECT id,version,deployment_id,environment,status,commit_ref,notes,created_at,deployed_at
      FROM deployment_releases ORDER BY created_at DESC LIMIT 15`),
    db.query(`SELECT id,severity,status,title_es,title_en,body_es,body_en,starts_at,resolved_at,updated_at
      FROM service_incidents ORDER BY starts_at DESC LIMIT 20`),
    db.query(`SELECT id,check_name,status,latency_ms,details,checked_at
      FROM system_checks ORDER BY checked_at DESC LIMIT 30`),
  ]);
  const runtime = settings.rows[0] ?? {};
  return NextResponse.json({
    status,
    settings: {
      maintenanceMode: Boolean(runtime.maintenance_mode),
      maintenanceTitleEs: runtime.maintenance_title_es ?? "",
      maintenanceTitleEn: runtime.maintenance_title_en ?? "",
      maintenanceMessageEs: runtime.maintenance_message_es ?? "",
      maintenanceMessageEn: runtime.maintenance_message_en ?? "",
      supportEmail: runtime.support_email ?? "",
      publicStatusMessageEs: runtime.public_status_message_es ?? "",
      publicStatusMessageEn: runtime.public_status_message_en ?? "",
      updatedAt: runtime.updated_at ? new Date(runtime.updated_at).toISOString() : null,
    },
    releases: (releases.rows as ReleaseRow[]).map((row) => ({
      id: Number(row.id), version: row.version, deploymentId: row.deployment_id, environment: row.environment,
      status: row.status, commitRef: row.commit_ref, notes: row.notes,
      createdAt: new Date(row.created_at).toISOString(), deployedAt: row.deployed_at ? new Date(row.deployed_at).toISOString() : null,
    })),
    incidents: (incidents.rows as IncidentRow[]).map((row) => ({
      id: row.id, severity: row.severity, status: row.status,
      titleEs: row.title_es, titleEn: row.title_en, bodyEs: row.body_es, bodyEn: row.body_en,
      startsAt: new Date(row.starts_at).toISOString(), resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : null,
      updatedAt: new Date(row.updated_at).toISOString(),
    })),
    checks: (checks.rows as CheckRow[]).map((row) => ({
      id: Number(row.id), name: row.check_name, status: row.status,
      latencyMs: row.latency_ms == null ? null : Number(row.latency_ms), details: row.details ?? {}, checkedAt: new Date(row.checked_at).toISOString(),
    })),
  });
}
