import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
type FeedbackRow = { id:string; category:string; entity_type:string|null; entity_id:string|null; rating:number|string; message:string; status:string; admin_response:string|null; created_at:Date|string; updated_at:Date|string; email:string; display_name:string };

export async function GET() {
  if (!await currentAdminSession()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [metrics, daily, feedback] = await Promise.all([
    db.query(`SELECT
      COUNT(*) FILTER (WHERE pilot_participant=TRUE)::int AS pilot_participants,
      COUNT(*) FILTER (WHERE analytics_consent=TRUE)::int AS analytics_participants,
      (SELECT COUNT(DISTINCT user_id)::int FROM analytics_events WHERE created_at>=NOW()-INTERVAL '7 days') AS active_users_7d,
      (SELECT COUNT(*)::int FROM analytics_events WHERE event_name='journey_planned' AND created_at>=NOW()-INTERVAL '7 days') AS journeys_planned_7d,
      (SELECT COUNT(*)::int FROM analytics_events WHERE event_name='ticket_purchased' AND created_at>=NOW()-INTERVAL '7 days') AS tickets_purchased_7d,
      (SELECT COUNT(*)::int FROM feedback_reports WHERE status IN ('new','reviewing','planned')) AS feedback_open,
      (SELECT COUNT(*)::int FROM feedback_reports) AS feedback_total,
      COALESCE((SELECT ROUND(AVG(rating)::numeric,2) FROM feedback_reports),0) AS average_rating
      FROM users`),
    db.query(`WITH days AS (SELECT generate_series(CURRENT_DATE-INTERVAL '13 days',CURRENT_DATE,INTERVAL '1 day')::date AS day),
      a AS (SELECT session_day AS day,COUNT(DISTINCT user_id)::int AS active_users,COUNT(*)::int AS events FROM analytics_events WHERE session_day>=CURRENT_DATE-13 GROUP BY session_day),
      f AS (SELECT created_at::date AS day,COUNT(*)::int AS feedback FROM feedback_reports WHERE created_at>=CURRENT_DATE-INTERVAL '13 days' GROUP BY created_at::date)
      SELECT d.day,COALESCE(a.active_users,0) AS active_users,COALESCE(a.events,0) AS events,COALESCE(f.feedback,0) AS feedback
      FROM days d LEFT JOIN a USING(day) LEFT JOIN f USING(day) ORDER BY d.day`),
    db.query(`SELECT f.id,f.category,f.entity_type,f.entity_id,f.rating,f.message,f.status,f.admin_response,f.created_at,f.updated_at,u.email,u.display_name
      FROM feedback_reports f JOIN users u ON u.id=f.user_id ORDER BY f.created_at DESC LIMIT 100`),
  ]);
  const m = metrics.rows[0];
  return NextResponse.json({
    metrics: { pilotParticipants:Number(m.pilot_participants), analyticsParticipants:Number(m.analytics_participants), activeUsers7d:Number(m.active_users_7d), journeysPlanned7d:Number(m.journeys_planned_7d), ticketsPurchased7d:Number(m.tickets_purchased_7d), feedbackOpen:Number(m.feedback_open), feedbackTotal:Number(m.feedback_total), averageRating:Number(m.average_rating) },
    daily: daily.rows.map((row: { day:Date|string; active_users:number|string; events:number|string; feedback:number|string }) => ({ day:new Date(row.day).toISOString().slice(0,10), activeUsers:Number(row.active_users), events:Number(row.events), feedback:Number(row.feedback) })),
    feedback: (feedback.rows as FeedbackRow[]).map((row) => ({ id:row.id,category:row.category,entityType:row.entity_type,entityId:row.entity_id,rating:Number(row.rating),message:row.message,status:row.status,adminResponse:row.admin_response,createdAt:new Date(row.created_at).toISOString(),updatedAt:new Date(row.updated_at).toISOString(),userEmail:row.email,userName:row.display_name })),
  });
}
