"use client";

import { type ChangeEvent, type FormEvent, useCallback, useEffect, useState } from "react";
import { jsonFetch } from "@/lib/client";
import type { Locale, SupportCase } from "@/lib/types";

const labels = {
  es: { title:"Ayuda y soporte", subtitle:"Envía una solicitud al equipo del piloto.", category:"Categoría", technical:"Problema técnico", account:"Cuenta", accessibility:"Accesibilidad", ticket:"Billete", service:"Servicio", subject:"Asunto", message:"Descripción", send:"Enviar solicitud", sent:"Solicitud enviada", history:"Mis solicitudes", empty:"No hay solicitudes", response:"Respuesta del equipo", open:"Abierta", in_progress:"En curso", resolved:"Resuelta", closed:"Cerrada" },
  en: { title:"Help and support", subtitle:"Send a request to the pilot team.", category:"Category", technical:"Technical issue", account:"Account", accessibility:"Accessibility", ticket:"Ticket", service:"Service", subject:"Subject", message:"Description", send:"Send request", sent:"Request sent", history:"My requests", empty:"No requests", response:"Team response", open:"Open", in_progress:"In progress", resolved:"Resolved", closed:"Closed" },
} as const;

export function SupportPanel({ locale }: { locale: Locale }) {
  const t = labels[locale];
  const [items, setItems] = useState<SupportCase[]>([]);
  const [category, setCategory] = useState<SupportCase["category"]>("technical");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try { const data = await jsonFetch<{ cases: SupportCase[] }>("/api/support"); setItems(data.cases); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Error"); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await jsonFetch("/api/support", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ category, subject, message }) });
      setSubject(""); setMessage(""); setStatus(t.sent); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Error"); }
  }

  const categoryNames: Record<SupportCase["category"], string> = { technical:t.technical, account:t.account, accessibility:t.accessibility, ticket:t.ticket, service:t.service };
  const statusNames: Record<SupportCase["status"], string> = { open:t.open, in_progress:t.in_progress, resolved:t.resolved, closed:t.closed };

  return <div className="support-layout">
    <section className="content-card"><h2>{t.title}</h2><p className="muted">{t.subtitle}</p>
      <form className="feedback-form" onSubmit={submit}>
        <label>{t.category}<select value={category} onChange={(event: ChangeEvent<HTMLSelectElement>) => setCategory(event.target.value as SupportCase["category"])}>{Object.entries(categoryNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label>{t.subject}<input value={subject} onChange={(event: ChangeEvent<HTMLInputElement>) => setSubject(event.target.value)} minLength={4} maxLength={120} required /></label>
        <label>{t.message}<textarea value={message} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setMessage(event.target.value)} minLength={10} maxLength={3000} required /></label>
        <button className="primary-button">{t.send}</button>{status && <p className="success-message">{status}</p>}{error && <p className="form-error">{error}</p>}
      </form>
    </section>
    <section className="content-card"><h2>{t.history}</h2>{!items.length ? <p className="empty-state">{t.empty}</p> : <div className="support-list">{items.map((item) => <article key={item.id}><header><span className={`source-status ${item.status === "resolved" || item.status === "closed" ? "healthy" : "configured"}`}>{statusNames[item.status]}</span><strong>{item.subject}</strong></header><p>{item.message}</p><small>{categoryNames[item.category]} · {new Date(item.createdAt).toLocaleString(locale === "en" ? "en-GB" : "es-ES")}</small>{item.adminResponse && <blockquote><strong>{t.response}</strong><p>{item.adminResponse}</p></blockquote>}</article>)}</div>}</section>
  </div>;
}
