"use client";

import { type ChangeEvent, type FormEvent, useCallback, useEffect, useState } from "react";
import { jsonFetch } from "@/lib/client";
import type { Locale, PilotOperationsResponse, SupportCase } from "@/lib/types";

const labels = {
  es: { title:"Operación del piloto", subtitle:"Invitaciones, onboarding, soporte y preparación del lanzamiento.", members:"Participantes activos", onboarded:"Onboarding completo", support:"Soporte abierto", invites:"Invitaciones activas", checklist:"Checklist", newInvite:"Crear invitación", cohort:"Cohorte", email:"Email opcional", uses:"Usos", days:"Días de validez", create:"Crear", inviteCreated:"Invitación creada", membersList:"Participantes", supportInbox:"Bandeja de soporte", response:"Respuesta", status:"Estado", save:"Guardar", report:"Generar informe", reportReady:"Informe generado", notes:"Notas" },
  en: { title:"Pilot operations", subtitle:"Invitations, onboarding, support and launch readiness.", members:"Active participants", onboarded:"Onboarding complete", support:"Open support", invites:"Active invitations", checklist:"Checklist", newInvite:"Create invitation", cohort:"Cohort", email:"Optional email", uses:"Uses", days:"Validity days", create:"Create", inviteCreated:"Invitation created", membersList:"Participants", supportInbox:"Support inbox", response:"Response", status:"Status", save:"Save", report:"Generate report", reportReady:"Report generated", notes:"Notes" },
} as const;
type Labels = (typeof labels)[Locale];

export function PilotOperationsPanel({ locale }: { locale: Locale }) {
  const t = labels[locale];
  const [data, setData] = useState<PilotOperationsResponse | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [email, setEmail] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    try {
      const value = await jsonFetch<PilotOperationsResponse>("/api/admin/pilot-ops");
      setData(value);
      setCohortId((current: string) => current || value.cohorts[0]?.id || "");
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Error"); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const result = await jsonFetch<{ code: string }>("/api/admin/pilot-ops/invites", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ cohortId, email, maxUses, expiresInDays:days }) });
      setNotice(`${t.inviteCreated}: ${result.code}`); setEmail(""); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Error"); }
  }
  async function updateChecklist(id: number, completed: boolean, notes: string) {
    await jsonFetch(`/api/admin/pilot-ops/checklist/${id}`, { method:"PATCH", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ completed, notes }) }); await load();
  }
  async function updateSupport(id: string, status: SupportCase["status"], response: string) {
    await jsonFetch(`/api/admin/pilot-ops/support/${id}`, { method:"PATCH", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ status, adminResponse:response }) }); await load();
  }
  async function report() {
    const result = await jsonFetch<{ id: string }>("/api/admin/pilot-ops/report", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ cohortId:cohortId || null }) });
    setNotice(`${t.reportReady}: ${result.id}`);
  }

  if (!data) return <section className="content-card"><p>{error || "…"}</p></section>;
  const m = data.metrics;
  const metrics: Array<[string, string | number]> = [[t.members,m.activeMembers],[t.onboarded,m.onboardingCompleted],[t.support,m.openSupport],[t.invites,m.activeInvites],[t.checklist,`${m.checklistCompleted}/${m.checklistTotal}`]];

  return <div className="pilot-ops-layout">
    <section className="content-card"><div className="section-heading"><div><h2>{t.title}</h2><p>{t.subtitle}</p></div><button className="secondary-button" onClick={report}>{t.report}</button></div><div className="operations-metrics">{metrics.map(([label,value]) => <article className="metric-card" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>{notice && <p className="success-message">{notice}</p>}{error && <p className="form-error">{error}</p>}</section>
    <section className="content-card"><h2>{t.newInvite}</h2><form className="inline-form pilot-invite-form" onSubmit={createInvite}>
      <label>{t.cohort}<select value={cohortId} onChange={(event: ChangeEvent<HTMLSelectElement>) => setCohortId(event.target.value)}>{data.cohorts.map((cohort) => <option value={cohort.id} key={cohort.id}>{cohort.code} · {cohort.name}</option>)}</select></label>
      <label>{t.email}<input type="email" value={email} onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)} /></label>
      <label>{t.uses}<input type="number" min="1" max="100" value={maxUses} onChange={(event: ChangeEvent<HTMLInputElement>) => setMaxUses(Number(event.target.value))} /></label>
      <label>{t.days}<input type="number" min="1" max="365" value={days} onChange={(event: ChangeEvent<HTMLInputElement>) => setDays(Number(event.target.value))} /></label>
      <button className="primary-button">{t.create}</button>
    </form><div className="invite-list">{data.invites.slice(0,12).map((invite) => <article key={invite.id}><strong>{invite.code}</strong><span>{invite.cohortCode} · {invite.usedCount}/{invite.maxUses} · {invite.status}</span></article>)}</div></section>
    <section className="content-card"><h2>{t.checklist}</h2><div className="pilot-checklist">{data.checklist.map((item) => <ChecklistItem key={item.id} item={item} locale={locale} labels={t} onSave={updateChecklist} />)}</div></section>
    <section className="content-card"><h2>{t.membersList}</h2><div className="member-table">{data.members.map((member) => <article key={member.userId}><div><strong>{member.name}</strong><small>{member.email} · {member.cohortCode}</small></div><span>{member.steps}/6</span></article>)}</div></section>
    <section className="content-card"><h2>{t.supportInbox}</h2><div className="pilot-feedback-list">{data.support.map((item) => <SupportAdminCard key={item.id} item={item} labels={t} onSave={updateSupport} />)}</div></section>
  </div>;
}

function ChecklistItem({ item, locale, labels: t, onSave }: { item: PilotOperationsResponse["checklist"][number]; locale: Locale; labels: Labels; onSave:(id:number,completed:boolean,notes:string)=>void }) {
  const [notes, setNotes] = useState(item.notes ?? "");
  return <article className={item.completed ? "completed" : ""}><label><input type="checkbox" checked={item.completed} onChange={(event: ChangeEvent<HTMLInputElement>) => onSave(item.id,event.target.checked,notes)} /><strong>{locale === "es" ? item.titleEs : item.titleEn}</strong></label><input aria-label={t.notes} value={notes} onChange={(event: ChangeEvent<HTMLInputElement>) => setNotes(event.target.value)} onBlur={() => onSave(item.id,item.completed,notes)} /></article>;
}

function SupportAdminCard({ item, labels: t, onSave }: { item: PilotOperationsResponse["support"][number]; labels: Labels; onSave:(id:string,status:SupportCase["status"],response:string)=>void }) {
  const [status, setStatus] = useState<SupportCase["status"]>(item.status);
  const [response, setResponse] = useState(item.adminResponse ?? "");
  return <article className="pilot-feedback-card"><header><div><strong>{item.subject}</strong><small>{item.userName} · {item.userEmail} · {item.priority}</small></div><span>{item.category}</span></header><p>{item.message}</p><div className="pilot-feedback-actions"><label>{t.status}<select value={status} onChange={(event: ChangeEvent<HTMLSelectElement>) => setStatus(event.target.value as SupportCase["status"])}>{["open","in_progress","resolved","closed"].map((value) => <option value={value} key={value}>{value}</option>)}</select></label><label>{t.response}<textarea value={response} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setResponse(event.target.value)} /></label><button className="primary-button" onClick={() => onSave(item.id,status,response)}>{t.save}</button></div></article>;
}
