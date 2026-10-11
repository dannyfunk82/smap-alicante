import { currentApiSession } from "@/lib/api-session";

export async function currentAdminSession() {
  const session = await currentApiSession();
  return session?.role === "admin" ? session : null;
}
