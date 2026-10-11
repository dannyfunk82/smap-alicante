// @ts-check

/** @typedef {"single" | "return" | "daily"} TicketType */
/** @typedef {"low" | "medium" | "high"} OccupancyLevel */

/**
 * @param {number} stopCount
 * @param {TicketType} ticketType
 * @returns {number}
 */
export function fareForStops(stopCount, ticketType) {
  if (!Number.isFinite(stopCount) || stopCount < 1) return 0;
  const base = stopCount <= 5 ? 1.45 : stopCount <= 10 ? 1.9 : 2.4;
  const multiplier = ticketType === "single" ? 1 : ticketType === "return" ? 1.8 : ticketType === "daily" ? 3 : 0;
  return Math.round(base * multiplier * 100) / 100;
}

/** @param {number} value @returns {number} */
export function clampPercentage(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

/** @param {number} value @returns {OccupancyLevel} */
export function occupancyLevelForPercentage(value) {
  const percentage = clampPercentage(value);
  return percentage < 40 ? "low" : percentage < 75 ? "medium" : "high";
}
