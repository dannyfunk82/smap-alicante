export type HandoverChecklistPolicyItem = { required?: boolean; completed: boolean };
export type HandoverDocumentPolicyItem = { status: "draft" | "reviewed" | "approved" };
export type HandoverCriticalCheck = { status: "ok" | "warning" | "error" };
export function checklistRate(items?: HandoverChecklistPolicyItem[]): number;
export function documentRate(documents?: HandoverDocumentPolicyItem[]): number;
export function acceptanceScore(input?: { checklist?: HandoverChecklistPolicyItem[]; documents?: HandoverDocumentPolicyItem[]; criticalChecks?: HandoverCriticalCheck[] }): number;
export function acceptanceRecommendation(score: number, criticalFailures?: number): "passed" | "conditional" | "failed";
