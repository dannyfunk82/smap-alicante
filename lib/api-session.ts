import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";

export async function currentApiSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const result = await db.query(
    "SELECT session_version, account_status FROM users WHERE id=$1",
    [session.sub],
  );
  const row = result.rows[0];
  if (!row || row.account_status !== "active" || Number(row.session_version) !== session.sessionVersion) return null;
  return session;
}
