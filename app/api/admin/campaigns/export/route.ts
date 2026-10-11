export const dynamic = "force-dynamic";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

function csv(value:unknown){const text=String(value??"");return `"${text.replaceAll('"','""')}"`;}
export async function GET(request:Request){
  const session=await currentAdminSession();if(!session)return new Response("Forbidden",{status:403});
  const surveyId=new URL(request.url).searchParams.get("surveyId");if(!surveyId)return new Response("surveyId required",{status:400});
  const survey=await db.query(`SELECT code,anonymous FROM pilot_surveys WHERE id=$1`,[surveyId]);if(!survey.rowCount)return new Response("Not found",{status:404});
  const result=await db.query(`SELECT pr.id AS response_id,pr.submitted_at,u.email,q.position,q.prompt_es,q.prompt_en,a.answer
    FROM pilot_survey_responses pr LEFT JOIN users u ON u.id=pr.user_id JOIN pilot_survey_answers a ON a.response_id=pr.id JOIN pilot_survey_questions q ON q.id=a.question_id
    WHERE pr.survey_id=$1 AND pr.submitted_at IS NOT NULL ORDER BY pr.submitted_at,q.position`,[surveyId]);
  const anonymous=Boolean(survey.rows[0].anonymous);
  const lines=[["response_id","submitted_at","participant","position","question_es","question_en","answer"].map(csv).join(","),...result.rows.map((r:Record<string,any>)=>[r.response_id,new Date(r.submitted_at).toISOString(),anonymous?"anonymous":r.email,r.position,r.prompt_es,r.prompt_en,JSON.stringify(r.answer)].map(csv).join(","))];
  return new Response(`\uFEFF${lines.join("\r\n")}`,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="${survey.rows[0].code}-responses.csv"`}});
}

