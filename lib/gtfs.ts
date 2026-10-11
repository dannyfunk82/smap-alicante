import { db } from "@/lib/db";
import type { Locale, ScheduledDeparture } from "@/lib/types";

function madridClock(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", weekday: "short",
  }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const seconds = Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
  const weekday = String(parts.weekday).slice(0, 3).toLowerCase();
  const weekdayColumn = ({ mon: "monday", tue: "tuesday", wed: "wednesday", thu: "thursday", fri: "friday", sat: "saturday", sun: "sunday" } as Record<string, string>)[weekday] ?? "monday";
  return { date, seconds, weekdayColumn };
}

export async function scheduledDeparturesForStop(stopId: string, locale: Locale, limit = 8): Promise<ScheduledDeparture[]> {
  const sourceResult = await db.query<{ source_id: string | null }>("SELECT source_id FROM stops WHERE id=$1", [stopId]);
  const sourceId = sourceResult.rows[0]?.source_id;
  if (!sourceId) return [];
  const { date, seconds, weekdayColumn } = madridClock();
  const lineName = locale === "en" ? "l.name_en" : "l.name_es";
  const query = `
    WITH base_services AS (
      SELECT service_id FROM gtfs_calendar
       WHERE source_id=$2 AND start_date <= $3::date AND end_date >= $3::date AND ${weekdayColumn}=TRUE
    ), additions AS (
      SELECT service_id FROM gtfs_calendar_dates WHERE source_id=$2 AND service_date=$3::date AND exception_type=1
    ), removals AS (
      SELECT service_id FROM gtfs_calendar_dates WHERE source_id=$2 AND service_date=$3::date AND exception_type=2
    ), active_services AS (
      (SELECT service_id FROM base_services UNION SELECT service_id FROM additions)
      EXCEPT SELECT service_id FROM removals
    )
    SELECT l.id AS line_id,l.code AS line_code,l.color,${lineName} AS line_name,
           t.trip_headsign,st.departure_seconds,st.arrival_seconds
      FROM gtfs_stop_times st
      JOIN gtfs_trips t ON t.source_id=st.source_id AND t.trip_id=st.trip_id
      JOIN active_services a ON a.service_id=t.service_id
      JOIN lines l ON l.id=t.internal_line_id
     WHERE st.source_id=$2 AND st.internal_stop_id=$1 AND st.departure_seconds >= $4
     ORDER BY st.departure_seconds
     LIMIT $5`;
  const result = await db.query(query, [stopId, sourceId, date, seconds, limit]);
  return result.rows.map((row: Record<string, unknown>) => {
    const departureSeconds = Number(row.departure_seconds);
    const hour = Math.floor(departureSeconds / 3600) % 24;
    const minute = Math.floor((departureSeconds % 3600) / 60);
    return {
      lineId: String(row.line_id), lineCode: String(row.line_code), lineColor: String(row.color), lineName: String(row.line_name),
      headsign: row.trip_headsign ? String(row.trip_headsign) : null,
      scheduledTime: `${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}`,
      minutesFromNow: Math.max(0, Math.ceil((departureSeconds - seconds) / 60)),
    };
  });
}
