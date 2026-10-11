export function onboardingPercentage(progress) {
  const values = Object.values(progress || {}).map(Boolean);
  if (!values.length) return 0;
  return Math.round((values.filter(Boolean).length / values.length) * 100);
}
export function supportPriority(category) {
  return category === "accessibility" || category === "account" ? "high" : "normal";
}
export function inviteAvailable(invite, now = new Date()) {
  if (!invite || invite.status !== "active") return false;
  if (Number(invite.usedCount) >= Number(invite.maxUses)) return false;
  return !invite.expiresAt || new Date(invite.expiresAt) > now;
}
