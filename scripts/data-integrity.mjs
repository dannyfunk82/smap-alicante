import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { integritySeverity } from "../lib/maintenance-policy.js";

const { Client } = pg;
const args = new Set(process.argv.slice(2));
const noFail = args.has("--no-fail");
const quiet = args.has("--quiet");
const outputDir = path.resolve("reports");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

async function tableExists(name) {
  const result = await client.query("SELECT to_regclass($1) AS name", [`public.${name}`]);
  return Boolean(result.rows[0]?.name);
}
async function count(sql, params = []) {
  const result = await client.query(sql, params);
  return Number(result.rows[0]?.count ?? 0);
}
function finding(key, severity, countValue, message, details = {}) {
  return { key, severity, count: countValue, message, details };
}

const findings = [];
const checks = [];
try {
  const migrationCount = await count("SELECT COUNT(*)::int AS count FROM schema_migrations");
  checks.push({ key: "migrations", status: migrationCount >= 16 ? "ok" : "warning", value: migrationCount, expected: ">=16" });
  if (migrationCount < 16) findings.push(finding("migrations", "warning", 1, `Solo ${migrationCount} migrazioni applicate; attese almeno 16.`));

  const duplicateUsers = await count("SELECT COUNT(*)::int AS count FROM (SELECT LOWER(email) FROM users GROUP BY LOWER(email) HAVING COUNT(*)>1) d");
  checks.push({ key: "duplicate_user_emails", status: duplicateUsers ? "error" : "ok", value: duplicateUsers });
  if (duplicateUsers) findings.push(finding("duplicate_user_emails", "error", duplicateUsers, "Sono presenti email utente duplicate senza distinzione maiuscole/minuscole."));

  const duplicateLines = await count("SELECT COUNT(*)::int AS count FROM (SELECT LOWER(code) FROM lines GROUP BY LOWER(code) HAVING COUNT(*)>1) d");
  checks.push({ key: "duplicate_line_codes", status: duplicateLines ? "error" : "ok", value: duplicateLines });
  if (duplicateLines) findings.push(finding("duplicate_line_codes", "error", duplicateLines, "Sono presenti codici linea duplicati."));

  const duplicateStops = await count("SELECT COUNT(*)::int AS count FROM (SELECT LOWER(code) FROM stops GROUP BY LOWER(code) HAVING COUNT(*)>1) d");
  checks.push({ key: "duplicate_stop_codes", status: duplicateStops ? "error" : "ok", value: duplicateStops });
  if (duplicateStops) findings.push(finding("duplicate_stop_codes", "error", duplicateStops, "Sono presenti codici fermata duplicati."));

  const invalidCoordinates = await count("SELECT COUNT(*)::int AS count FROM stops WHERE latitude NOT BETWEEN -90 AND 90 OR longitude NOT BETWEEN -180 AND 180");
  checks.push({ key: "invalid_stop_coordinates", status: invalidCoordinates ? "error" : "ok", value: invalidCoordinates });
  if (invalidCoordinates) findings.push(finding("invalid_stop_coordinates", "error", invalidCoordinates, "Alcune fermate hanno coordinate geografiche non valide."));

  const outsideAlicante = await count("SELECT COUNT(*)::int AS count FROM stops WHERE latitude NOT BETWEEN 37.9 AND 38.8 OR longitude NOT BETWEEN -1.2 AND 0.2");
  checks.push({ key: "stops_outside_demo_area", status: outsideAlicante ? "warning" : "ok", value: outsideAlicante });
  if (outsideAlicante) findings.push(finding("stops_outside_demo_area", "warning", outsideAlicante, "Alcune fermate sono fuori dall'area dimostrativa di Alicante."));

  const missingLineStops = await count("SELECT COUNT(*)::int AS count FROM lines l LEFT JOIN line_stops ls ON ls.line_id=l.id WHERE ls.line_id IS NULL");
  checks.push({ key: "lines_without_stops", status: missingLineStops ? "error" : "ok", value: missingLineStops });
  if (missingLineStops) findings.push(finding("lines_without_stops", "error", missingLineStops, "Alcune linee non hanno fermate associate."));

  const repeatedSequences = await count("SELECT COUNT(*)::int AS count FROM (SELECT line_id,sequence FROM line_stops GROUP BY line_id,sequence HAVING COUNT(*)>1) d");
  checks.push({ key: "duplicate_stop_sequences", status: repeatedSequences ? "error" : "ok", value: repeatedSequences });
  if (repeatedSequences) findings.push(finding("duplicate_stop_sequences", "error", repeatedSequences, "Sono presenti sequenze fermata duplicate nella stessa linea."));

  const linesWithTooFewStops = await count("SELECT COUNT(*)::int AS count FROM (SELECT line_id,COUNT(*) n FROM line_stops GROUP BY line_id HAVING COUNT(*)<2) d");
  checks.push({ key: "lines_with_too_few_stops", status: linesWithTooFewStops ? "warning" : "ok", value: linesWithTooFewStops });
  if (linesWithTooFewStops) findings.push(finding("lines_with_too_few_stops", "warning", linesWithTooFewStops, "Alcune linee hanno meno di due fermate."));

  if (await tableExists("tickets")) {
    const invalidTicketDates = await count("SELECT COUNT(*)::int AS count FROM tickets WHERE activated_at IS NOT NULL AND expires_at IS NOT NULL AND expires_at < activated_at");
    checks.push({ key: "invalid_ticket_dates", status: invalidTicketDates ? "error" : "ok", value: invalidTicketDates });
    if (invalidTicketDates) findings.push(finding("invalid_ticket_dates", "error", invalidTicketDates, "Alcuni biglietti scadono prima dell'attivazione."));

    const activeExpiredTickets = await count("SELECT COUNT(*)::int AS count FROM tickets WHERE status='active' AND expires_at IS NOT NULL AND expires_at < NOW()");
    checks.push({ key: "active_but_expired_tickets", status: activeExpiredTickets ? "warning" : "ok", value: activeExpiredTickets });
    if (activeExpiredTickets) findings.push(finding("active_but_expired_tickets", "warning", activeExpiredTickets, "Alcuni biglietti risultano attivi anche se la scadenza è trascorsa."));
  }

  if (await tableExists("favorites")) {
    const invalidFavorites = await count(`SELECT COUNT(*)::int AS count FROM favorites f
      WHERE (favorite_type='line' AND NOT EXISTS(SELECT 1 FROM lines l WHERE l.id=f.entity_id))
         OR (favorite_type='stop' AND NOT EXISTS(SELECT 1 FROM stops s WHERE s.id=f.entity_id))`);
    checks.push({ key: "invalid_favorites", status: invalidFavorites ? "warning" : "ok", value: invalidFavorites });
    if (invalidFavorites) findings.push(finding("invalid_favorites", "warning", invalidFavorites, "Alcuni preferiti puntano a entità non esistenti."));
  }

  if (await tableExists("external_bus_positions")) {
    const invalidTelemetry = await count(`SELECT COUNT(*)::int AS count FROM external_bus_positions
      WHERE latitude NOT BETWEEN -90 AND 90 OR longitude NOT BETWEEN -180 AND 180
         OR occupancy_percentage NOT BETWEEN 0 AND 100`);
    checks.push({ key: "invalid_external_telemetry", status: invalidTelemetry ? "error" : "ok", value: invalidTelemetry });
    if (invalidTelemetry) findings.push(finding("invalid_external_telemetry", "error", invalidTelemetry, "Sono presenti record di telemetria esterna non validi."));
  }

  const rowCounts = {};
  for (const table of ["users", "lines", "stops", "line_stops", "buses", "tickets", "notifications", "audit_logs"]) {
    if (await tableExists(table)) rowCounts[table] = await count(`SELECT COUNT(*)::int AS count FROM ${table}`);
  }

  const summary = integritySeverity(findings);
  const report = {
    format: "smap-data-integrity-v1",
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    summary,
    rowCounts,
    checks,
    findings,
  };
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, "data-integrity.json"), JSON.stringify(report, null, 2), "utf8");
  const markdown = [
    "# SMAP Data Integrity Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: **${summary.status.toUpperCase()}**`,
    `Critical findings: ${summary.critical}`,
    `Warnings: ${summary.warnings}`,
    "",
    "## Row counts",
    "",
    ...Object.entries(rowCounts).map(([table, value]) => `- ${table}: ${value}`),
    "",
    "## Findings",
    "",
    ...(findings.length ? findings.map((item) => `- **${item.severity.toUpperCase()}** \`${item.key}\`: ${item.message} (${item.count})`) : ["- No integrity findings."]),
    "",
  ].join("\n");
  await fs.writeFile(path.join(outputDir, "data-integrity.md"), markdown, "utf8");
  if (!quiet) console.log(JSON.stringify(report, null, 2));
  if (!noFail && summary.status === "error") process.exitCode = 2;
} finally {
  await client.end().catch(() => undefined);
}
