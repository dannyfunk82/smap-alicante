export function evaluateSlo({ direction, target, warning, current }) {
  if (current === null || current === undefined || Number.isNaN(Number(current))) return "unknown";
  const value = Number(current);
  if (direction === "min") {
    if (value >= Number(target)) return "ok";
    if (value >= Number(warning)) return "warning";
    return "breach";
  }
  if (value <= Number(target)) return "ok";
  if (value <= Number(warning)) return "warning";
  return "breach";
}

export function continuityScore({ sloStatuses = [], activeOnCall = false, criticalIncidents = 0, failedExercises = 0, overdueExercises = 0, postmortemsPending = 0 }) {
  let score = 100;
  for (const status of sloStatuses) {
    if (status === "breach") score -= 18;
    else if (status === "warning") score -= 7;
    else if (status === "unknown") score -= 4;
  }
  if (!activeOnCall) score -= 18;
  score -= Math.min(30, Number(criticalIncidents) * 15);
  score -= Math.min(20, Number(failedExercises) * 10);
  score -= Math.min(15, Number(overdueExercises) * 5);
  score -= Math.min(16, Number(postmortemsPending) * 4);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function continuityRecommendation(score, criticalIncidents = 0) {
  if (Number(criticalIncidents) > 0 || score < 55) return "at_risk";
  if (score < 85) return "watch";
  return "stable";
}

export function exerciseTimeliness({ status, scheduledAt, now = new Date() }) {
  if (["completed", "cancelled"].includes(status)) return "closed";
  return new Date(scheduledAt).getTime() < now.getTime() ? "overdue" : "scheduled";
}
