import { db } from "@/lib/db";
import { canTrackAnalytics } from "@/lib/pilot-policy.js";

function safeProperties(properties: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const result: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(properties).slice(0, 10)) {
    if (!/^[a-zA-Z0-9_]{1,40}$/.test(key)) continue;
    if (typeof value === "string") result[key] = value.slice(0, 100);
    else if (typeof value === "number" && Number.isFinite(value)) result[key] = value;
    else if (typeof value === "boolean" || value === null) result[key] = value;
  }
  return result;
}

export async function trackAnalyticsEvent(input: {
  userId: string;
  eventName: string;
  section?: string | null;
  properties?: Record<string, unknown>;
}): Promise<boolean> {
  const consent = await db.query("SELECT analytics_consent FROM users WHERE id=$1", [input.userId]);
  if (!canTrackAnalytics(Boolean(consent.rows[0]?.analytics_consent), input.eventName)) return false;
  await db.query(
    `INSERT INTO analytics_events(user_id,event_name,section,properties)
     VALUES($1,$2,$3,$4::jsonb)`,
    [input.userId, input.eventName, input.section ?? null, JSON.stringify(safeProperties(input.properties ?? {}))],
  );
  return true;
}
