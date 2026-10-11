import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

function csv(value: unknown) { return `"${String(value ?? "").replaceAll('"','""')}"`; }
export async function GET() {
  if (!await currentAdminSession()) return Response.json({ error:"Forbidden" }, { status:403 });
  const result = await db.query(`SELECT f.id,u.email,f.category,f.entity_type,f.entity_id,f.rating,f.status,f.message,f.admin_response,f.created_at,f.updated_at
    FROM feedback_reports f JOIN users u ON u.id=f.user_id ORDER BY f.created_at DESC`);
  const lines = [["id","email","category","entity_type","entity_id","rating","status","message","admin_response","created_at","updated_at"].map(csv).join(",")];
  for (const row of result.rows) lines.push([row.id,row.email,row.category,row.entity_type,row.entity_id,row.rating,row.status,row.message,row.admin_response,new Date(row.created_at).toISOString(),new Date(row.updated_at).toISOString()].map(csv).join(","));
  return new Response(lines.join("\r\n"), { headers:{ "Content-Type":"text/csv; charset=utf-8", "Content-Disposition":`attachment; filename="smap-pilot-feedback-${new Date().toISOString().slice(0,10)}.csv"` } });
}
