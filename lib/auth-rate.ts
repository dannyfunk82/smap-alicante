import { db } from "@/lib/db";
import { MAX_IP_ATTEMPTS, RATE_WINDOW_MINUTES } from "@/lib/security.js";

export async function recordAuthAttempt(input: { email: string; ip: string; eventType: "login" | "register"; success: boolean }) {
  await db.query(
    `INSERT INTO auth_attempts(email, ip_address, event_type, success)
     VALUES($1,$2,$3,$4)`,
    [input.email, input.ip, input.eventType, input.success],
  );
}

export async function isRateLimited(ip: string, eventType: "login" | "register"): Promise<boolean> {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count FROM auth_attempts
      WHERE ip_address=$1 AND event_type=$2
        AND created_at > NOW() - ($3 || ' minutes')::interval
        AND ($2 = 'register' OR success = FALSE)`,
    [ip, eventType, String(RATE_WINDOW_MINUTES)],
  );
  return Number(result.rows[0]?.count ?? 0) >= MAX_IP_ATTEMPTS;
}
