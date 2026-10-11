import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export default async function PrivacyPage(){const result=await db.query(`SELECT version,title_es,title_en,content_es,content_en,published_at FROM privacy_documents WHERE document_type='privacy' AND active=TRUE ORDER BY published_at DESC LIMIT 1`);const doc=result.rows[0];return <main className="legal-page"><a href="/">← SMAP</a><article className="content-card"><p className="eyebrow">SMAP · Privacy</p><h1>{doc?.title_es??"Aviso de privacidad"}</h1><p>{doc?.content_es}</p><hr/><h2>{doc?.title_en}</h2><p>{doc?.content_en}</p><small>v{doc?.version} · {doc?.published_at?new Date(doc.published_at).toLocaleDateString("es-ES"):""}</small></article></main>}
