import { createHash } from "node:crypto";

export function rolloutBucket(subject) {
  const digest = createHash("sha256").update(String(subject || "anonymous")).digest();
  return digest.readUInt32BE(0) % 100;
}

export function featureEnabled(flag, subject, environment = "local") {
  if (!flag?.enabled) return false;
  const environments = Array.isArray(flag.environments) ? flag.environments : [];
  if (environments.length && !environments.includes(environment)) return false;
  const rollout = Math.max(0, Math.min(100, Number(flag.rolloutPercent ?? 100)));
  return rollout >= 100 || rolloutBucket(subject) < rollout;
}

export function retentionCutoff(retentionDays, now = new Date()) {
  const days = Math.max(1, Math.floor(Number(retentionDays) || 1));
  return new Date(now.getTime() - days * 86_400_000);
}

export function approvalAllowsDeploy(decision) {
  return decision === "approved" || decision === "conditional";
}

export function calculateGoLiveReadiness({ checklist = [], checks = [], criticalIncidents = 0, releaseApproval = null }) {
  const required = checklist.filter((item) => item.required !== false);
  const completed = required.filter((item) => item.completed).length;
  const checklistRate = required.length ? Math.round((completed / required.length) * 100) : 0;
  const errorChecks = checks.filter((item) => item.status === "error").map((item) => item.name);
  const warningChecks = checks.filter((item) => item.status === "warning").map((item) => item.name);
  const missingChecklist = required.filter((item) => !item.completed).map((item) => item.key);
  const blockers = [];
  if (criticalIncidents > 0) blockers.push("critical_incident");
  blockers.push(...errorChecks.map((name) => `check:${name}`));
  blockers.push(...missingChecklist.map((key) => `checklist:${key}`));
  if (!releaseApproval || !approvalAllowsDeploy(releaseApproval.decision)) blockers.push("release_approval");
  let score = checklistRate;
  score -= Math.min(30, errorChecks.length * 15);
  score -= Math.min(15, warningChecks.length * 5);
  score -= Math.min(30, criticalIncidents * 20);
  if (releaseApproval?.decision === "approved") score += 5;
  score = Math.max(0, Math.min(100, score));
  const recommendation = blockers.length === 0 && score >= 90 ? "ready" : score >= 70 && criticalIncidents === 0 && errorChecks.length === 0 ? "ready_with_conditions" : "not_ready";
  return { score, recommendation, blockers, checklistRate, errorChecks, warningChecks };
}
