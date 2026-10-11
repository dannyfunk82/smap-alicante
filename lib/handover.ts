import { db } from "@/lib/db";
import { acceptanceRecommendation, acceptanceScore, checklistRate, documentRate } from "@/lib/handover-policy.js";
import { APP_VERSION } from "@/lib/system";

const iso = (value: Date | string | null) => value ? new Date(value).toISOString() : null;

type ChecklistRow = { item_key:string; category:string; title_es:string; title_en:string; required:boolean; completed:boolean; evidence:string|null; owner:string|null; completed_at:Date|string|null; updated_at:Date|string };
type DocumentRow = { document_key:string; title_es:string; title_en:string; relative_path:string; version:string; status:"draft"|"reviewed"|"approved"; owner:string|null; notes:string; last_reviewed_at:Date|string|null; updated_at:Date|string };
type RunRow = { id:string; release_version:string; environment:string; status:"passed"|"conditional"|"failed"; score:number; checks:unknown; notes:string; started_at:Date|string; completed_at:Date|string; created_at:Date|string };

export async function handoverState() {
  const [checklistResult, documentsResult, runsResult, databaseCheck, migrationCheck] = await Promise.all([
    db.query("SELECT * FROM handover_checklist ORDER BY category,item_key"),
    db.query("SELECT * FROM handover_documents ORDER BY document_key"),
    db.query("SELECT * FROM acceptance_runs ORDER BY created_at DESC LIMIT 20"),
    db.query("SELECT COUNT(*)::int AS users, (SELECT COUNT(*)::int FROM lines) AS lines, (SELECT COUNT(*)::int FROM stops) AS stops, (SELECT COUNT(*)::int FROM buses) AS buses FROM users"),
    db.query("SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE filename='016_handover_acceptance.sql') AS applied"),
  ]);
  const checklist = (checklistResult.rows as ChecklistRow[]).map((row) => ({ key:row.item_key, category:row.category, titleEs:row.title_es, titleEn:row.title_en, required:row.required, completed:row.completed, evidence:row.evidence, owner:row.owner, completedAt:iso(row.completed_at), updatedAt:iso(row.updated_at)! }));
  const documents = (documentsResult.rows as DocumentRow[]).map((row) => ({ key:row.document_key, titleEs:row.title_es, titleEn:row.title_en, path:row.relative_path, version:row.version, status:row.status, owner:row.owner, notes:row.notes, lastReviewedAt:iso(row.last_reviewed_at), updatedAt:iso(row.updated_at)! }));
  const runs = (runsResult.rows as RunRow[]).map((row) => ({ id:row.id, releaseVersion:row.release_version, environment:row.environment, status:row.status, score:Number(row.score), checks:Array.isArray(row.checks)?row.checks:[], notes:row.notes, startedAt:iso(row.started_at)!, completedAt:iso(row.completed_at)!, createdAt:iso(row.created_at)! }));
  const counts = databaseCheck.rows[0] ?? { users:0, lines:0, stops:0, buses:0 };
  const checks = [
    { key:"database", status:"ok" as const, detail:`users=${counts.users}` },
    { key:"migration_016", status:migrationCheck.rows[0]?.applied ? "ok" as const : "error" as const, detail:"016_handover_acceptance.sql" },
    { key:"network_seed", status:Number(counts.lines)>=3 && Number(counts.stops)>=30 && Number(counts.buses)>=6 ? "ok" as const : "warning" as const, detail:`lines=${counts.lines}, stops=${counts.stops}, buses=${counts.buses}` },
  ];
  const score = acceptanceScore({ checklist, documents, criticalChecks:checks });
  const criticalFailures = checks.filter((check) => check.status === "error").length;
  return {
    releaseVersion: APP_VERSION,
    summary: { score, recommendation:acceptanceRecommendation(score, criticalFailures), checklistRate:checklistRate(checklist), documentRate:documentRate(documents), requiredPending:checklist.filter((item)=>item.required&&!item.completed).length, documentsPending:documents.filter((item)=>item.status!=="approved").length },
    checks, checklist, documents, runs,
  };
}
