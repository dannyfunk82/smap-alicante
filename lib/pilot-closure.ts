import { db } from "@/lib/db";
import { buildPilotFindings, pilotRecommendation, readinessScore } from "@/lib/closure-policy.js";

export type PilotClosureMetrics = {
  participants:number; onboardingCompleted:number; onboardingCompletionRate:number;
  eligibleSurveyResponses:number; submittedSurveyResponses:number; surveyResponseRate:number;
  averageSurveyRating:number; averageFeedbackRating:number; averageRating:number;
  supportTotal:number; supportResolved:number; supportResolutionRate:number;
  checklistTotal:number; checklistCompleted:number; checklistCompletionRate:number;
  activeUsers14d:number; activeUseRate:number; ticketsPurchased:number;
  openFeedback:number; criticalOpenActions:number; readinessScore:number;
  recommendation:"go"|"go_with_conditions"|"extend_pilot"|"stop";
};

function percent(numerator:number, denominator:number) {
  if (!denominator) return 0;
  return Math.min(100, Math.round((numerator / denominator) * 100));
}

export async function collectPilotClosureMetrics():Promise<PilotClosureMetrics> {
  const result = await db.query(`SELECT
    (SELECT COUNT(*)::int FROM pilot_memberships WHERE status IN ('active','completed')) AS participants,
    (SELECT COUNT(*)::int FROM onboarding_progress WHERE completed_at IS NOT NULL) AS onboarding_completed,
    (SELECT COUNT(*)::int FROM pilot_surveys WHERE status IN ('active','closed')) AS survey_count,
    (SELECT COUNT(*)::int FROM pilot_survey_responses WHERE submitted_at IS NOT NULL) AS submitted_responses,
    COALESCE((SELECT ROUND(AVG((a.answer #>> '{}')::numeric),2) FROM pilot_survey_answers a JOIN pilot_survey_questions q ON q.id=a.question_id WHERE q.question_type='rating' AND (a.answer #>> '{}') ~ '^[1-5](\\.0+)?$'),0) AS average_survey_rating,
    COALESCE((SELECT ROUND(AVG(rating)::numeric,2) FROM feedback_reports),0) AS average_feedback_rating,
    (SELECT COUNT(*)::int FROM support_cases) AS support_total,
    (SELECT COUNT(*)::int FROM support_cases WHERE status IN ('resolved','closed')) AS support_resolved,
    (SELECT COUNT(*)::int FROM pilot_checklist) AS checklist_total,
    (SELECT COUNT(*)::int FROM pilot_checklist WHERE completed=TRUE) AS checklist_completed,
    (SELECT COUNT(DISTINCT user_id)::int FROM analytics_events WHERE created_at>=NOW()-INTERVAL '14 days') AS active_users_14d,
    (SELECT COUNT(*)::int FROM tickets) AS tickets_purchased,
    (SELECT COUNT(*)::int FROM feedback_reports WHERE status IN ('new','reviewing','planned')) AS open_feedback,
    (SELECT COUNT(*)::int FROM pilot_improvement_actions WHERE priority='critical' AND status NOT IN ('completed','rejected')) AS critical_open_actions`);
  const row = result.rows[0] ?? {};
  const participants = Number(row.participants || 0);
  const onboardingCompleted = Number(row.onboarding_completed || 0);
  const surveyCount = Number(row.survey_count || 0);
  const eligibleSurveyResponses = participants * surveyCount;
  const submittedSurveyResponses = Number(row.submitted_responses || 0);
  const averageSurveyRating = Number(row.average_survey_rating || 0);
  const averageFeedbackRating = Number(row.average_feedback_rating || 0);
  const averageRating = Number(((averageSurveyRating + averageFeedbackRating) / (averageSurveyRating > 0 && averageFeedbackRating > 0 ? 2 : 1)).toFixed(2));
  const supportTotal = Number(row.support_total || 0);
  const supportResolved = Number(row.support_resolved || 0);
  const checklistTotal = Number(row.checklist_total || 0);
  const checklistCompleted = Number(row.checklist_completed || 0);
  const activeUsers14d = Number(row.active_users_14d || 0);
  const base = {
    participants,
    onboardingCompleted,
    onboardingCompletionRate: percent(onboardingCompleted, participants),
    eligibleSurveyResponses,
    submittedSurveyResponses,
    surveyResponseRate: percent(submittedSurveyResponses, eligibleSurveyResponses),
    averageSurveyRating,
    averageFeedbackRating,
    averageRating,
    supportTotal,
    supportResolved,
    supportResolutionRate: percent(supportResolved, supportTotal),
    checklistTotal,
    checklistCompleted,
    checklistCompletionRate: percent(checklistCompleted, checklistTotal),
    activeUsers14d,
    activeUseRate: percent(activeUsers14d, participants),
    ticketsPurchased: Number(row.tickets_purchased || 0),
    openFeedback: Number(row.open_feedback || 0),
    criticalOpenActions: Number(row.critical_open_actions || 0),
  };
  const score = readinessScore(base);
  return { ...base, readinessScore: score, recommendation: pilotRecommendation(score, base.criticalOpenActions) };
}

export function pilotClosureFindings(metrics:PilotClosureMetrics) {
  return buildPilotFindings(metrics);
}

export function reportSummary(metrics:PilotClosureMetrics, locale:"es"|"en") {
  const recommendation = metrics.recommendation.replaceAll("_", " ");
  return locale === "es"
    ? `El piloto alcanza una preparación del ${metrics.readinessScore}%, con valoración media ${metrics.averageRating.toFixed(1)}/5 y una recomendación ${recommendation}.`
    : `The pilot reaches ${metrics.readinessScore}% readiness, with an average rating of ${metrics.averageRating.toFixed(1)}/5 and a ${recommendation} recommendation.`;
}
