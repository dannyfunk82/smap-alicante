export const allowedAnalyticsEvents = new Set([
  "section_viewed", "journey_planned", "ticket_purchased", "ticket_activated",
  "favorite_added", "feedback_submitted", "privacy_updated", "survey_submitted"
]);

export function normalizeRating(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(1, Math.min(5, Math.round(parsed)));
}

export function validFeedbackMessage(value) {
  const text = String(value ?? "").trim();
  return text.length >= 10 && text.length <= 2000;
}

export function canTrackAnalytics(consent, eventName) {
  return Boolean(consent) && allowedAnalyticsEvents.has(String(eventName));
}

export function feedbackStatusTransition(current, next) {
  const allowed = {
    new: ["reviewing", "planned", "resolved", "closed"],
    reviewing: ["planned", "resolved", "closed"],
    planned: ["reviewing", "resolved", "closed"],
    resolved: ["reviewing", "closed"],
    closed: ["reviewing"],
  };
  return Boolean(allowed[current]?.includes(next));
}
