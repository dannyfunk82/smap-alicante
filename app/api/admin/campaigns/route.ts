import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { surveyCompletionRate } from "@/lib/campaign-policy.js";

export const dynamic="force-dynamic";
type Row=Record<string,any>;

export async function GET(){
  const session=await currentAdminSession();if(!session)return NextResponse.json({error:"Forbidden"},{status:403});
  const [metricRows,cohorts,campaigns,surveys,broadcasts]=await Promise.all([
    db.query(`SELECT
      (SELECT COUNT(*)::int FROM pilot_campaigns WHERE status='active' AND (starts_at IS NULL OR starts_at<=NOW()) AND (ends_at IS NULL OR ends_at>=NOW())) AS active_campaigns,
      (SELECT COUNT(*)::int FROM pilot_surveys WHERE status='active' AND (opens_at IS NULL OR opens_at<=NOW()) AND (closes_at IS NULL OR closes_at>=NOW())) AS active_surveys,
      (SELECT COUNT(*)::int FROM pilot_survey_responses WHERE submitted_at IS NOT NULL) AS submitted_responses,
      (SELECT COUNT(*)::int FROM pilot_broadcasts WHERE status='sent') AS broadcasts_sent,
      (SELECT COUNT(*)::int FROM pilot_memberships WHERE status='active') AS eligible_members`),
    db.query(`SELECT pc.id,pc.code,pc.name,COUNT(pm.user_id)::int AS member_count FROM pilot_cohorts pc LEFT JOIN pilot_memberships pm ON pm.cohort_id=pc.id AND pm.status='active' GROUP BY pc.id ORDER BY pc.created_at DESC`),
    db.query(`SELECT pc.id,pc.code,pc.title_es,pc.title_en,pc.status,pc.starts_at,pc.ends_at,c.code AS cohort_code,
      COUNT(DISTINCT ps.id)::int AS survey_count,COUNT(DISTINCT pr.id) FILTER(WHERE pr.submitted_at IS NOT NULL)::int AS response_count
      FROM pilot_campaigns pc LEFT JOIN pilot_cohorts c ON c.id=pc.cohort_id LEFT JOIN pilot_surveys ps ON ps.campaign_id=pc.id LEFT JOIN pilot_survey_responses pr ON pr.survey_id=ps.id
      GROUP BY pc.id,c.code ORDER BY pc.created_at DESC`),
    db.query(`SELECT ps.id,ps.code,ps.title_es,ps.title_en,ps.status,pc.code AS campaign_code,pc.cohort_id,
      COUNT(DISTINCT pr.id) FILTER(WHERE pr.submitted_at IS NOT NULL)::int AS response_count,
      COALESCE(ROUND(AVG(CASE WHEN q.question_type='rating' THEN (a.answer#>>'{}')::numeric END),2),NULL) AS average_rating
      FROM pilot_surveys ps JOIN pilot_campaigns pc ON pc.id=ps.campaign_id
      LEFT JOIN pilot_survey_responses pr ON pr.survey_id=ps.id
      LEFT JOIN pilot_survey_answers a ON a.response_id=pr.id
      LEFT JOIN pilot_survey_questions q ON q.id=a.question_id
      GROUP BY ps.id,pc.code,pc.cohort_id ORDER BY ps.created_at DESC`),
    db.query(`SELECT pb.id,pb.title_es,pb.title_en,pb.status,pb.recipient_count,pb.sent_at,pb.created_at,c.code AS cohort_code,pc.code AS campaign_code
      FROM pilot_broadcasts pb LEFT JOIN pilot_cohorts c ON c.id=pb.cohort_id LEFT JOIN pilot_campaigns pc ON pc.id=pb.campaign_id ORDER BY pb.created_at DESC LIMIT 50`),
  ]);
  const metrics=metricRows.rows[0];
  const surveyItems=surveys.rows.map((row:Row)=>{
    const cohort=cohorts.rows.find((c:Row)=>c.id===row.cohort_id);
    const eligible=cohort?Number(cohort.member_count):Number(metrics.eligible_members);
    return {id:row.id,code:row.code,titleEs:row.title_es,titleEn:row.title_en,status:row.status,campaignCode:row.campaign_code,responseCount:Number(row.response_count),eligibleCount:eligible,completionRate:surveyCompletionRate(Number(row.response_count),eligible),averageRating:row.average_rating===null?null:Number(row.average_rating)};
  });
  const submitted=Number(metrics.submitted_responses),eligible=Math.max(1,Number(metrics.eligible_members)*Math.max(1,Number(metrics.active_surveys)));
  return NextResponse.json({
    metrics:{activeCampaigns:Number(metrics.active_campaigns),activeSurveys:Number(metrics.active_surveys),submittedResponses:submitted,responseRate:surveyCompletionRate(submitted,eligible),broadcastsSent:Number(metrics.broadcasts_sent)},
    cohorts:cohorts.rows.map((r:Row)=>({id:r.id,code:r.code,name:r.name,memberCount:Number(r.member_count)})),
    campaigns:campaigns.rows.map((r:Row)=>({id:r.id,code:r.code,titleEs:r.title_es,titleEn:r.title_en,status:r.status,cohortCode:r.cohort_code,startsAt:r.starts_at?new Date(r.starts_at).toISOString():null,endsAt:r.ends_at?new Date(r.ends_at).toISOString():null,surveyCount:Number(r.survey_count),responseCount:Number(r.response_count)})),
    surveys:surveyItems,
    broadcasts:broadcasts.rows.map((r:Row)=>({id:r.id,titleEs:r.title_es,titleEn:r.title_en,status:r.status,recipientCount:Number(r.recipient_count),cohortCode:r.cohort_code,campaignCode:r.campaign_code,sentAt:r.sent_at?new Date(r.sent_at).toISOString():null,createdAt:new Date(r.created_at).toISOString()})),
  });
}
