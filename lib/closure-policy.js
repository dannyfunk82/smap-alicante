const priorityWeight = { low: 1, medium: 2, high: 3, critical: 4 };
const impactWeight = { low: 1, medium: 2, high: 3 };
const effortWeight = { small: 1, medium: 2, large: 3 };

export function actionPriorityScore(priority, impact, effort) {
  const p = priorityWeight[priority] || 1;
  const i = impactWeight[impact] || 1;
  const e = effortWeight[effort] || 2;
  return Math.round(((p * 2 + i * 2) / e) * 10) / 10;
}

export function readinessScore(metrics) {
  const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));
  const rating = clamp((Number(metrics.averageRating) || 0) * 20);
  const score =
    clamp(metrics.onboardingCompletionRate) * 0.2 +
    clamp(metrics.surveyResponseRate) * 0.2 +
    rating * 0.2 +
    clamp(metrics.supportResolutionRate) * 0.15 +
    clamp(metrics.checklistCompletionRate) * 0.15 +
    clamp(metrics.activeUseRate) * 0.1;
  const criticalPenalty = Math.min(25, Math.max(0, Number(metrics.criticalOpenActions) || 0) * 8);
  return Math.max(0, Math.min(100, Math.round(score - criticalPenalty)));
}

export function pilotRecommendation(score, criticalOpenActions = 0) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  if (Number(criticalOpenActions) > 0 && value >= 65) return "go_with_conditions";
  if (value >= 80) return "go";
  if (value >= 65) return "go_with_conditions";
  if (value >= 45) return "extend_pilot";
  return "stop";
}

export function decisionToActionStatus(decision) {
  if (decision === "approve") return "approved";
  if (decision === "reject") return "rejected";
  return "proposed";
}

export function buildPilotFindings(metrics) {
  const findings = [];
  if (Number(metrics.averageRating) >= 4) findings.push({ tone: "positive", code: "rating", es: "La valoración media del piloto es alta.", en: "The pilot average rating is high." });
  else findings.push({ tone: "warning", code: "rating", es: "La valoración media requiere acciones de mejora.", en: "The average rating requires improvement actions." });
  if (Number(metrics.surveyResponseRate) < 60) findings.push({ tone: "warning", code: "survey", es: "La tasa de respuesta de las encuestas es inferior al objetivo del 60%.", en: "Survey response is below the 60% target." });
  else findings.push({ tone: "positive", code: "survey", es: "La participación en encuestas alcanza el objetivo.", en: "Survey participation meets the target." });
  if (Number(metrics.supportResolutionRate) < 80) findings.push({ tone: "warning", code: "support", es: "La resolución de solicitudes de soporte debe mejorar.", en: "Support case resolution should improve." });
  if (Number(metrics.criticalOpenActions) > 0) findings.push({ tone: "critical", code: "critical_actions", es: "Existen acciones críticas pendientes antes del lanzamiento.", en: "Critical actions remain open before launch." });
  if (!findings.some((item) => item.tone === "critical" || item.tone === "warning")) findings.push({ tone: "positive", code: "readiness", es: "Los indicadores principales respaldan el avance a la siguiente fase.", en: "The main indicators support moving to the next phase." });
  return findings;
}
