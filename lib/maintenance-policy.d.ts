export type MaintenanceStatus = "ok" | "warning" | "error";
export function maintenanceStatus(checks?: Array<{ status?: string }>): MaintenanceStatus;
export function redactSecret(value: unknown): string;
export function integritySeverity(findings?: Array<{ severity?: string }>): { status: MaintenanceStatus; critical: number; warnings: number; total: number };
export function safeSupportBundleName(date?: Date): string;
