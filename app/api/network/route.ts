import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "es";
  const lineName = locale === "en" ? "name_en" : "name_es";
  const stopName = locale === "en" ? "s.name_en" : "s.name_es";

  const [linesResult, stopsResult, busCountResult] = await Promise.all([
    db.query(`SELECT id, code, ${lineName} AS name, color FROM lines ORDER BY code`),
    db.query(`
      SELECT ls.line_id, ls.sequence, s.id, s.code, ${stopName} AS name,
             s.latitude, s.longitude, s.accessible
      FROM line_stops ls
      JOIN stops s ON s.id = ls.stop_id
      ORDER BY ls.line_id, ls.sequence
    `),
    db.query("SELECT COUNT(*)::int AS count FROM buses")
  ]);

  const stopsByLine = new Map<string, unknown[]>();
  for (const row of stopsResult.rows) {
    const current = stopsByLine.get(row.line_id) ?? [];
    current.push({
      id: row.id,
      code: row.code,
      name: row.name,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      accessible: row.accessible,
      sequence: row.sequence,
    });
    stopsByLine.set(row.line_id, current);
  }

  const lines = linesResult.rows.map((line: Record<string, any>) => ({ ...line, stops: stopsByLine.get(line.id) ?? [] }));
  return NextResponse.json({
    demo: true,
    lines,
    stopCount: stopsResult.rowCount ?? 0,
    busCount: busCountResult.rows[0].count,
  });
}
