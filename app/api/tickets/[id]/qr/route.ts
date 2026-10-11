import QRCode from "qrcode";
import { db } from "@/lib/db";
import { currentApiSession } from "@/lib/api-session";
import { signedTicketPayload } from "@/lib/demo";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const session = await currentApiSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const { id } = await context.params;
  const result = await db.query("SELECT id, public_code, status, expires_at FROM tickets WHERE id=$1 AND user_id=$2", [id, session.sub]);
  if (!result.rowCount) return new Response("Not found", { status: 404 });
  const row = result.rows[0];
  const payload = signedTicketPayload({ id: row.id, publicCode: row.public_code, status: row.status, expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null });
  const svg = await QRCode.toString(payload, { type: "svg", errorCorrectionLevel: "M", margin: 2, width: 280 });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" } });
}
