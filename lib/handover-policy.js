export function checklistRate(items = []) {
  const required = items.filter((item) => item.required !== false);
  if (!required.length) return 100;
  return Math.round((required.filter((item) => item.completed).length / required.length) * 100);
}

export function documentRate(documents = []) {
  if (!documents.length) return 0;
  return Math.round((documents.filter((document) => document.status === "approved").length / documents.length) * 100);
}

export function acceptanceScore({ checklist = [], documents = [], criticalChecks = [] } = {}) {
  const checklistScore = checklistRate(checklist);
  const documentScore = documentRate(documents);
  const criticalFailures = criticalChecks.filter((check) => check.status === "error").length;
  const warnings = criticalChecks.filter((check) => check.status === "warning").length;
  const base = Math.round(checklistScore * 0.65 + documentScore * 0.35);
  return Math.max(0, Math.min(100, base - criticalFailures * 20 - warnings * 5));
}

export function acceptanceRecommendation(score, criticalFailures = 0) {
  if (criticalFailures > 0 || score < 70) return "failed";
  if (score < 90) return "conditional";
  return "passed";
}
