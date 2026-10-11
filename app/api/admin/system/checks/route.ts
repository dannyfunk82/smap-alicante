import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";

async function store(checkName: string, status: "ok" | "warning" | "error", latencyMs: number | null, details: Record<string, unknown>, userId: string) {
  await db.query(`INSERT INTO system_checks(check_name,status,latency_ms,details,checked_by) VALUES($1,$2,$3,$4::jsonb,$5)`, [checkName, status, latencyMs, JSON.stringify(details), userId]);
  return { name: checkName, status, latencyMs, details, checkedAt: new Date().toISOString() };
}

export async function POST(request: Request) {
  const session = await currentAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const checks = [];
  const dbStarted = performance.now();
  try {
    const result = await db.query("SELECT current_database() AS name, NOW() AS now");
    const latency = Math.round(performance.now() - dbStarted);
    checks.push(await store("database", latency > 500 ? "warning" : "ok", latency, { database: result.rows[0]?.name }, session.sub));
  } catch (error) {
    checks.push(await store("database", "error", Math.round(performance.now() - dbStarted), { error: error instanceof Error ? error.message : "Database error" }, session.sub));
  }
  const integration = await db.query(`SELECT mode,fallback_enabled,max_age_seconds,active_source_id FROM integration_settings WHERE id=1`).catch(() => ({ rows: [] }));
  const integrationRow = integration.rows[0];
  checks.push(await store("integration_configuration", integrationRow ? "ok" : "error", null, integrationRow ?? { error: "Missing integration settings" }, session.sub));
  const latestExternal = await db.query("SELECT MAX(recorded_at) AS last_update FROM external_bus_positions").catch(() => ({ rows: [] }));
  const lastUpdate = latestExternal.rows[0]?.last_update ? new Date(latestExternal.rows[0].last_update) : null;
  const ageSeconds = lastUpdate ? Math.round((Date.now() - lastUpdate.getTime()) / 1000) : null;
  checks.push(await store("external_telemetry", ageSeconds == null ? "warning" : ageSeconds > Number(integrationRow?.max_age_seconds ?? 45) ? "warning" : "ok", null, { lastUpdate: lastUpdate?.toISOString() ?? null, ageSeconds }, session.sub));
  const secrets = { authSecretLength: process.env.AUTH_SECRET?.length ?? 0, integrationKeyLength: process.env.INTEGRATION_API_KEY?.length ?? 0, forceHttps: process.env.FORCE_HTTPS === "true" };
  const secretStatus = secrets.authSecretLength < 32 || secrets.integrationKeyLength < 16 ? "error" : process.env.SMAP_ENVIRONMENT === "production" && !secrets.forceHttps ? "warning" : "ok";
  checks.push(await store("environment", secretStatus, null, secrets, session.sub));
  await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "admin.system_checks_run", entityType: "system_check", ipAddress: requestIp(request), details: { count: checks.length } });
  return NextResponse.json({ ok: true, checks });
}
