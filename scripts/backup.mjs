import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const outputDir = path.resolve(process.argv[2] || "backups");
await fs.mkdir(outputDir, { recursive: true });
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const tables = [
  "schema_migrations", "users", "lines", "stops", "line_stops", "buses", "favorites", "tickets",
  "notifications", "demo_settings", "demo_bus_controls", "auth_attempts", "audit_logs",
  "integration_sources", "integration_settings", "external_bus_positions", "integration_sync_runs",
  "gtfs_datasets", "gtfs_routes", "gtfs_stops", "gtfs_calendar", "gtfs_calendar_dates", "gtfs_trips", "gtfs_stop_times", "gtfs_shapes",
  "runtime_settings", "deployment_releases", "system_checks", "service_incidents",
  "privacy_documents", "user_consents", "analytics_events", "feedback_reports",
  "pilot_cohorts", "pilot_invites", "pilot_memberships", "onboarding_progress", "support_cases", "pilot_checklist", "pilot_report_snapshots",
  "pilot_campaigns", "pilot_surveys", "pilot_survey_questions", "pilot_survey_responses", "pilot_survey_answers", "pilot_broadcasts",
  "pilot_kpi_snapshots", "pilot_improvement_actions", "pilot_decisions", "pilot_final_reports",
  "feature_flags", "data_retention_policies", "retention_runs", "operational_contacts", "go_live_checklist", "release_approvals", "go_live_snapshots",
  "release_plans", "release_steps", "release_health_observations", "release_rollback_points", "release_rollbacks",
  "operational_slos", "operational_measurements", "on_call_shifts", "continuity_exercises", "incident_postmortems",
  "handover_checklist", "handover_documents", "acceptance_runs",
];
const data = {};
try {
  for (const table of tables) {
    const exists = await client.query("SELECT to_regclass($1) AS name", [`public.${table}`]);
    if (!exists.rows[0]?.name) continue;
    const result = await client.query(`SELECT * FROM ${table}`);
    data[table] = result.rows;
  }
} finally { await client.end(); }

const payload = JSON.stringify({
  format: "smap-json-backup-v1", version: "1.0.0", createdAt: new Date().toISOString(), tables: data,
}, null, 2);
const stamp = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
const filename = `smap-backup-${stamp}.json`;
const filepath = path.join(outputDir, filename);
await fs.writeFile(filepath, payload, "utf8");
const checksum = crypto.createHash("sha256").update(payload).digest("hex");
await fs.writeFile(`${filepath}.sha256`, `${checksum}  ${filename}\n`, "utf8");
console.log(`Backup created: ${filepath}`);
console.log(`SHA-256: ${checksum}`);
