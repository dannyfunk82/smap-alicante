"use client";

import { type ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { jsonFetch } from "@/lib/client";
import type { CampaignsResponse, Locale, PilotSurvey, SurveyQuestion } from "@/lib/types";

const labels={
  es:{title:"Campañas del piloto",subtitle:"Participa en actividades y cuestionarios para mejorar SMAP.",membership:"Cohorte",active:"Activa",planned:"Próxima",closed:"Cerrada",survey:"Cuestionario",submitted:"Enviado",send:"Enviar respuestas",thanks:"Gracias. Tus respuestas se han guardado.",empty:"No hay campañas disponibles.",required:"Obligatoria",optional:"Opcional",rating:"Valoración",select:"Selecciona una opción",characters:"caracteres",anonymous:"Respuesta anónima",loading:"Cargando…"},
  en:{title:"Pilot campaigns",subtitle:"Take part in activities and surveys to improve SMAP.",membership:"Cohort",active:"Active",planned:"Upcoming",closed:"Closed",survey:"Survey",submitted:"Submitted",send:"Submit answers",thanks:"Thank you. Your answers have been saved.",empty:"No campaigns are available.",required:"Required",optional:"Optional",rating:"Rating",select:"Select an option",characters:"characters",anonymous:"Anonymous response",loading:"Loading…"},
} as const;

export function CampaignsPanel({locale,onChanged}:{locale:Locale;onChanged?:()=>void}){
  const t=labels[locale];const [data,setData]=useState<CampaignsResponse|null>(null);const [error,setError]=useState("");
  const load=useCallback(async()=>{try{setData(await jsonFetch<CampaignsResponse>(`/api/campaigns?lang=${locale}`));setError("");}catch(cause){setError(cause instanceof Error?cause.message:"Error");}},[locale]);
  useEffect(()=>{void load();},[load]);
  if(!data)return <section className="content-card"><p>{error||t.loading}</p></section>;
  return <div className="campaign-layout"><section className="content-card"><div className="section-heading"><div><h2>{t.title}</h2><p>{t.subtitle}</p></div>{data.membership&&<span className="status-pill">{t.membership}: {data.membership.cohortCode}</span>}</div>{!data.campaigns.length?<p className="empty-state">{t.empty}</p>:<div className="campaign-list">{data.campaigns.map((campaign)=><article className={`campaign-card ${campaign.status}`} key={campaign.id}><header><div><span className={`source-status ${campaign.status==="active"?"healthy":"configured"}`}>{t[campaign.status as "active"|"planned"|"closed"]??campaign.status}</span><h3>{campaign.title}</h3><small>{campaign.code}{campaign.cohortCode?` · ${campaign.cohortCode}`:""}</small></div>{campaign.startsAt&&<time>{new Date(campaign.startsAt).toLocaleDateString(locale==="en"?"en-GB":"es-ES")}</time>}</header><p>{campaign.description}</p><div className="campaign-surveys">{campaign.surveys.map((survey)=><SurveyCard key={survey.id} survey={survey} locale={locale} labels={t} onSubmitted={async()=>{await load();onChanged?.();}}/> )}</div></article>)}</div>}{error&&<p className="form-error" role="alert">{error}</p>}</section></div>;
}

type Labels=(typeof labels)[Locale];
function SurveyCard({survey,locale,labels:t,onSubmitted}:{survey:PilotSurvey;locale:Locale;labels:Labels;onSubmitted:()=>void}){
  const [answers,setAnswers]=useState<Record<string,unknown>>({});const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
  async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError("");try{await jsonFetch(`/api/campaigns/surveys/${survey.id}/responses`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({answers})});setMessage(t.thanks);onSubmitted();}catch(cause){setError(cause instanceof Error?cause.message:"Error");}finally{setBusy(false)}}
  return <section className="survey-card"><header><div><strong>{t.survey}: {survey.title}</strong><small>{survey.description}</small></div>{survey.submitted?<span className="source-status healthy">✓ {t.submitted}</span>:survey.anonymous?<span className="source-status configured">{t.anonymous}</span>:null}</header>{survey.submitted?<p className="success-message">{t.thanks}</p>:survey.status!=="active"?<p className="muted">{survey.status}</p>:<form className="survey-form" onSubmit={submit}>{survey.questions.map((question)=><QuestionField key={question.id} question={question} locale={locale} labels={t} value={answers[question.id]} onChange={(value)=>setAnswers((current)=>({...current,[question.id]:value}))}/>) }<button className="primary-button" disabled={busy}>{t.send}</button>{message&&<p className="success-message" role="status">{message}</p>}{error&&<p className="form-error" role="alert">{error}</p>}</form>}</section>;
}

function QuestionField({question,labels:t,value,onChange}:{question:SurveyQuestion;locale:Locale;labels:Labels;value:unknown;onChange:(value:unknown)=>void}){
  return <fieldset className="survey-question"><legend>{question.position}. {question.prompt} <small>{question.required?t.required:t.optional}</small></legend>{question.type==="rating"?<div className="rating-row">{[1,2,3,4,5].map((rating)=><button type="button" key={rating} aria-label={`${t.rating} ${rating}/5`} className={value===rating?"selected":""} onClick={()=>onChange(rating)}>★</button>)}</div>:question.type==="single"?<select required={question.required} value={String(value??"")} onChange={(event:ChangeEvent<HTMLSelectElement>)=>onChange(event.target.value)}><option value="">{t.select}</option>{question.options.map((option)=><option key={option} value={option}>{option}</option>)}</select>:<textarea required={question.required} minLength={question.required?3:0} maxLength={2000} value={String(value??"")} onChange={(event:ChangeEvent<HTMLTextAreaElement>)=>onChange(event.target.value)}/>}</fieldset>;
}
