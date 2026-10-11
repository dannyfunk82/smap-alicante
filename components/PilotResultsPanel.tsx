"use client";

import { useCallback, useEffect, useState } from "react";
import { jsonFetch } from "@/lib/client";
import type { Locale, PublicPilotResults } from "@/lib/types";

const labels={
  es:{title:"Resultados del piloto",subtitle:"Indicadores agregados y próximos pasos de SMAP, sin mostrar datos personales.",readiness:"Preparación",participants:"Participantes",survey:"Respuesta a encuestas",rating:"Valoración media",support:"Soporte resuelto",recommendation:"Recomendación",go:"Avanzar",go_with_conditions:"Avanzar con condiciones",extend_pilot:"Ampliar el piloto",stop:"No avanzar",findings:"Conclusiones",report:"Informe final",notPublished:"El informe final todavía no se ha publicado.",updated:"Actualizado"},
  en:{title:"Pilot results",subtitle:"Aggregated indicators and next steps for SMAP, without displaying personal data.",readiness:"Readiness",participants:"Participants",survey:"Survey response",rating:"Average rating",support:"Support resolved",recommendation:"Recommendation",go:"Proceed",go_with_conditions:"Proceed with conditions",extend_pilot:"Extend pilot",stop:"Do not proceed",findings:"Findings",report:"Final report",notPublished:"The final report has not been published yet.",updated:"Updated"},
} as const;

export function PilotResultsPanel({locale}:{locale:Locale}){
  const t=labels[locale];const [data,setData]=useState<PublicPilotResults|null>(null);const [error,setError]=useState("");
  const load=useCallback(async()=>{try{setData(await jsonFetch<PublicPilotResults>(`/api/pilot-results?lang=${locale}`));setError("");}catch(cause){setError(cause instanceof Error?cause.message:"Error");}},[locale]);
  useEffect(()=>{void load();},[load]);
  if(!data)return <section className="content-card"><p>{error||"…"}</p></section>;
  const m=data.metrics;const recommendation=t[m.recommendation];
  return <div className="pilot-results-layout">
    <section className="content-card pilot-results-hero"><div><p className="eyebrow">SMAP Alicante</p><h2>{t.title}</h2><p>{t.subtitle}</p></div><div className={`readiness-ring score-${m.readinessScore>=80?"high":m.readinessScore>=60?"medium":"low"}`} aria-label={`${t.readiness}: ${m.readinessScore}%`}><strong>{m.readinessScore}%</strong><span>{t.readiness}</span></div></section>
    <section className="content-card"><div className="operations-metrics pilot-result-metrics">{[[t.participants,m.participants],[t.survey,`${m.surveyResponseRate}%`],[t.rating,`${m.averageRating.toFixed(1)}/5`],[t.support,`${m.supportResolutionRate}%`]].map(([label,value])=><article className="metric-card" key={String(label)}><span>{label}</span><strong>{value}</strong></article>)}</div><div className={`recommendation-banner ${m.recommendation}`}><span>{t.recommendation}</span><strong>{recommendation}</strong></div></section>
    <section className="content-card"><h2>{t.findings}</h2><div className="finding-list">{data.findings.map((finding)=><article key={finding.code} className={`finding-card ${finding.tone}`}><span aria-hidden="true">{finding.tone==="positive"?"✓":finding.tone==="critical"?"!":"i"}</span><p>{finding.text}</p></article>)}</div></section>
    <section className="content-card"><h2>{t.report}</h2>{data.latestReport?<article className="final-report-summary"><header><div><strong>{data.latestReport.title}</strong><small>{data.latestReport.publishedAt?new Date(data.latestReport.publishedAt).toLocaleDateString(locale==="es"?"es-ES":"en-GB"):""}</small></div><span className="status-pill">{t[data.latestReport.recommendation]}</span></header><p>{locale==="es"?data.latestReport.executiveSummaryEs:data.latestReport.executiveSummaryEn}</p>{data.latestReport.risks.length>0&&<ul>{data.latestReport.risks.map((risk)=><li key={risk}>{risk}</li>)}</ul>}</article>:<p className="empty-state">{t.notPublished}</p>}<small>{t.updated}: {new Date(data.updatedAt).toLocaleString(locale==="es"?"es-ES":"en-GB")}</small></section>
  </div>;
}
