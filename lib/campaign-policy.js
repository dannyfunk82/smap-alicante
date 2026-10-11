export function campaignIsActive(campaign, now = new Date()) {
  if (campaign.status !== "active") return false;
  const instant = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (campaign.startsAt && new Date(campaign.startsAt).getTime() > instant) return false;
  if (campaign.endsAt && new Date(campaign.endsAt).getTime() < instant) return false;
  return true;
}

export function validateSurveyAnswer(question, value) {
  if (value === undefined || value === null || value === "") return !question.required;
  if (question.type === "rating") {
    const rating = Number(value);
    return Number.isInteger(rating) && rating >= 1 && rating <= 5;
  }
  if (question.type === "single") {
    return typeof value === "string" && Array.isArray(question.options) && question.options.includes(value);
  }
  if (question.type === "text") return typeof value === "string" && value.trim().length >= 3 && value.trim().length <= 2000;
  return false;
}

export function surveyCompletionRate(submitted, eligible) {
  const denominator = Math.max(0, Number(eligible) || 0);
  if (!denominator) return 0;
  return Math.min(100, Math.round((Math.max(0, Number(submitted) || 0) / denominator) * 100));
}
