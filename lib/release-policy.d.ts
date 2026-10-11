export type Check = { status: "ok" | "warning" | "error" };
export function aggregateHealth(checks: Check[]): "ok" | "warning" | "error" | "unknown";
export function deploymentReady(input: { database: string; environment: string; authSecretLength: number; integrationKeyLength: number; forceHttps: boolean }): { ready: boolean; failures: string[]; warnings: string[] };
export function maintenanceState(enabled: boolean, openCriticalIncidents: number): "maintenance" | "degraded" | "operational";
