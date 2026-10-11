"use client";

import { type ChangeEvent, useCallback, useEffect, useState } from "react";
import { jsonFetch } from "@/lib/client";
import type { Locale, PrivacyState } from "@/lib/types";

const labels = {
  es: { title:"Privacidad y consentimiento",subtitle:"Controla qué datos opcionales se utilizan durante el piloto.",analytics:"Analítica de uso",analyticsHint:"Permite registrar eventos funcionales como secciones vistas, planificación y compras demo. No registra contraseñas ni datos de pago.",pilot:"Participar en el piloto",pilotHint:"Permite que el equipo use tus valoraciones para mejorar SMAP.",save:"Guardar preferencias",saved:"Preferencias guardadas",documents:"Documentos vigentes",accepted:"Aceptado",accept:"Aceptar versión vigente",export:"Exportar mis datos",delete:"Solicitar eliminación",deleteHint:"La solicitud se registra para revisión. La cuenta no se elimina de forma inmediata.",confirm:"Escribe DELETE para confirmar",requested:"Solicitud registrada",loading:"Cargando…" },
  en: { title:"Privacy and consent",subtitle:"Control which optional data is used during the pilot.",analytics:"Usage analytics",analyticsHint:"Allows functional events such as viewed sections, journey planning and demo purchases. Passwords and payment data are not recorded.",pilot:"Join the pilot",pilotHint:"Allows the team to use your feedback to improve SMAP.",save:"Save preferences",saved:"Preferences saved",documents:"Current documents",accepted:"Accepted",accept:"Accept current version",export:"Export my data",delete:"Request deletion",deleteHint:"The request is recorded for review. The account is not deleted immediately.",confirm:"Type DELETE to confirm",requested:"Request recorded",loading:"Loading…" },
} as const;

export function PrivacyPanel({ locale, onChanged }: { locale: Locale; onChanged?: (state: PrivacyState) => void }) {
  const t=labels[locale]; const [data,setData]=useState<PrivacyState|null>(null); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(""); const [error,setError]=useState(""); const [confirm,setConfirm]=useState("");
  const load=useCallback(async()=>{try{const value=await jsonFetch<PrivacyState>(`/api/privacy?lang=${locale}`);setData(value);onChanged?.(value);setError("");}catch(cause){setError(cause instanceof Error?cause.message:"Error");}},[locale,onChanged]);
  useEffect(()=>{void load();},[load]);
  async function save(acceptCurrent=false){if(!data)return;setBusy(true);setMessage("");try{await jsonFetch("/api/privacy",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({analyticsConsent:data.analyticsConsent,pilotParticipant:data.pilotParticipant,acceptCurrent})});setMessage(t.saved);await load();}catch(cause){setError(cause instanceof Error?cause.message:"Error");}finally{setBusy(false)}}
  async function requestDeletion(){setBusy(true);setMessage("");try{await jsonFetch("/api/privacy/delete-request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirm})});setMessage(t.requested);setConfirm("");await load();}catch(cause){setError(cause instanceof Error?cause.message:"Error");}finally{setBusy(false)}}
  if(!data)return <section className="content-card"><p>{error||t.loading}</p></section>;
  const currentPrivacy=data.documents.find((doc)=>doc.type==="privacy");
  return <div className="privacy-layout">
    <section className="content-card"><h2>{t.title}</h2><p className="muted">{t.subtitle}</p>
      <div className="setting-list">
        <label className="setting-row"><span><strong>{t.analytics}</strong><small>{t.analyticsHint}</small></span><input type="checkbox" checked={data.analyticsConsent} onChange={(e: ChangeEvent<HTMLInputElement>)=>setData({...data,analyticsConsent:e.target.checked})}/></label>
        <label className="setting-row"><span><strong>{t.pilot}</strong><small>{t.pilotHint}</small></span><input type="checkbox" checked={data.pilotParticipant} onChange={(e: ChangeEvent<HTMLInputElement>)=>setData({...data,pilotParticipant:e.target.checked})}/></label>
      </div>
      <div className="button-row"><button className="primary-button" onClick={()=>void save(false)} disabled={busy}>{t.save}</button><a className="secondary-button button-link" href="/api/privacy/export">{t.export}</a></div>
      {message&&<p className="success-message" role="status">{message}</p>}{error&&<p className="form-error" role="alert">{error}</p>}
    </section>
    <section className="content-card"><h2>{t.documents}</h2><div className="privacy-documents">{data.documents.map((doc)=><article key={`${doc.type}-${doc.version}`}><header><strong>{doc.title}</strong><span>v{doc.version}</span></header><p>{doc.content}</p><small>{new Date(doc.publishedAt).toLocaleDateString(locale==="en"?"en-GB":"es-ES")}</small></article>)}</div>
      <div className="button-row"><span className={`source-status ${data.privacyAccepted?"healthy":"degraded"}`}>{data.privacyAccepted?`${t.accepted} v${data.privacyVersion}`:"Pending"}</span>{currentPrivacy&&data.privacyVersion!==currentPrivacy.version&&<button className="secondary-button" onClick={()=>void save(true)} disabled={busy}>{t.accept}</button>}</div>
    </section>
    <section className="content-card danger-card"><h2>{t.delete}</h2><p className="muted">{t.deleteHint}</p>{data.deletionRequestedAt?<p className="success-message">{t.requested}: {new Date(data.deletionRequestedAt).toLocaleString(locale==="en"?"en-GB":"es-ES")}</p>:<div className="delete-request-row"><label>{t.confirm}<input value={confirm} onChange={(e: ChangeEvent<HTMLInputElement>)=>setConfirm(e.target.value)} placeholder="DELETE"/></label><button className="danger-button" onClick={()=>void requestDeletion()} disabled={busy||confirm.toUpperCase()!=="DELETE"}>{t.delete}</button></div>}</section>
  </div>;
}
