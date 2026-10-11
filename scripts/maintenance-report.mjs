import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { maintenanceStatus, redactSecret } from "../lib/maintenance-policy.js";

const outputDir = path.resolve("reports");
await fs.mkdir(outputDir, { recursive: true });
const checks = [];
function add(name, status, details = {}) { checks.push({ name, status, details }); }

add("node", Number(process.versions.node.split(".")[0]) >= 22 ? "ok" : "error", { version: process.versions.node });
add("environment", process.env.DATABASE_URL ? "ok" : "error", {
  databaseUrl: redactSecret(process.env.DATABASE_URL),
  authSecret: redactSecret(process.env.AUTH_SECRET),
  integrationKey: redactSecret(process.env.INTEGRATION_API_KEY),
});
add("package_lock", await fs.access("package-lock.json").then(() => "ok").catch(() => "warning"));

const integrity = spawnSync(process.execPath, ["--env-file=.env.local", "scripts/data-integrity.mjs", "--no-fail", "--quiet"], { encoding: "utf8" });
if (integrity.status === 0 || integrity.status === 2) {
  try {
    const report = JSON.parse(await fs.readFile(path.join(outputDir, "data-integrity.json"), "utf8"));
    add("data_integrity", report.summary?.status || "warning", report.summary || {});
  } catch (error) { add("data_integrity", "error", { error: error instanceof Error ? error.message : String(error) }); }
} else add("data_integrity", "error", { stderr: integrity.stderr.trim() });

let health = null;
try {
  const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/health`, { signal: AbortSignal.timeout(3000) });
  health = await response.json();
  add("running_application", response.ok ? "ok" : "warning", { status: response.status, health });
} catch { add("running_application", "warning", { message: "Application not reachable; this is acceptable during offline maintenance." }); }

const report = {
  format: "smap-maintenance-report-v1",
  version: "1.0.0",
  generatedAt: new Date().toISOString(),
  status: maintenanceStatus(checks),
  system: { platform: process.platform, release: os.release(), architecture: os.arch(), hostname: os.hostname(), node: process.versions.node },
  checks,
  health,
};
await fs.writeFile(path.join(outputDir, "maintenance-report.json"), JSON.stringify(report, null, 2), "utf8");
const md = [
  "# SMAP Maintenance Report", "", `Generated: ${report.generatedAt}`, `Overall status: **${report.status.toUpperCase()}**`, "",
  "## Checks", "", ...checks.map((item) => `- **${item.status.toUpperCase()}** \`${item.name}\`: ${JSON.stringify(item.details)}`), "",
].join("\n");
await fs.writeFile(path.join(outputDir, "maintenance-report.md"), md, "utf8");
console.log(JSON.stringify(report, null, 2));
if (report.status === "error") process.exitCode = 1;
