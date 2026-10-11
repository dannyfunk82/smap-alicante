export function deploymentProgress(steps = []) {
  const required = steps.filter((step) => step.required !== false);
  if (!required.length) return 0;
  const completed = required.filter((step) => step.status === "completed" || step.status === "skipped").length;
  return Math.round((completed / required.length) * 100);
}

export function releaseRisk({ steps = [], observations = [], criticalIncidents = 0 } = {}) {
  const failedRequired = steps.filter((step) => step.required !== false && step.status === "failed").length;
  const errors = observations.filter((item) => item.status === "error").length;
  const warnings = observations.filter((item) => item.status === "warning").length;
  if (criticalIncidents > 0 || failedRequired > 0 || errors >= 2) return "critical";
  if (errors > 0 || warnings >= 2) return "high";
  if (warnings > 0) return "medium";
  return "low";
}

export function canPromoteRelease({ plan, steps = [], goLiveRecommendation, approvalDecision, criticalIncidents = 0 } = {}) {
  if (!plan || ["failed", "rolled_back", "cancelled"].includes(plan.status)) return false;
  if (criticalIncidents > 0) return false;
  if (!steps.length || steps.some((step) => step.required !== false && step.status !== "completed")) return false;
  if (!['ready','ready_with_conditions'].includes(goLiveRecommendation)) return false;
  return approvalDecision === "approved" || approvalDecision === "conditional";
}

export function rollbackRecommendation({ steps = [], observations = [], criticalIncidents = 0 } = {}) {
  const failedRequired = steps.filter((step) => step.required !== false && step.status === "failed").length;
  const errors = observations.filter((item) => item.status === "error").length;
  if (criticalIncidents > 0 || failedRequired > 0 || errors >= 2) return "rollback";
  if (errors === 1 || observations.some((item) => item.status === "warning")) return "hold";
  return "continue";
}

export function nextRolloutPercent(current, observationStatus = "ok") {
  const value = Math.max(0, Math.min(100, Number(current) || 0));
  if (observationStatus === "error") return Math.max(0, value - 25);
  if (observationStatus === "warning") return value;
  if (value < 10) return 10;
  if (value < 25) return 25;
  if (value < 50) return 50;
  return 100;
}
