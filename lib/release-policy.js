export function aggregateHealth(checks) {
  if (!Array.isArray(checks) || checks.length === 0) return "unknown";
  if (checks.some((check) => check.status === "error")) return "error";
  if (checks.some((check) => check.status === "warning")) return "warning";
  return "ok";
}

export function deploymentReady({ database, environment, authSecretLength, integrationKeyLength, forceHttps }) {
  const failures = [];
  const warnings = [];
  if (database !== "connected") failures.push("database");
  if (authSecretLength < 32) failures.push("auth_secret");
  if (integrationKeyLength < 16) failures.push("integration_key");
  if (environment === "production" && !forceHttps) warnings.push("force_https");
  return { ready: failures.length === 0, failures, warnings };
}

export function maintenanceState(enabled, openCriticalIncidents) {
  if (enabled) return "maintenance";
  if (openCriticalIncidents > 0) return "degraded";
  return "operational";
}
