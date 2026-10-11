export const allowedAnalyticsEvents: Set<string>;
export function normalizeRating(value: unknown): number;
export function validFeedbackMessage(value: unknown): boolean;
export function canTrackAnalytics(consent: unknown, eventName: unknown): boolean;
export function feedbackStatusTransition(current: string, next: string): boolean;
