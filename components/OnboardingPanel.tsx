"use client";

import { type ChangeEvent, type FormEvent, useCallback, useEffect, useState } from "react";
import { jsonFetch } from "@/lib/client";
import type { Locale, OnboardingState } from "@/lib/types";

const labels = {
  es: { title:"Guía del piloto", subtitle:"Completa estos pasos para probar todas las funciones de SMAP.", invite:"Código de invitación", join:"Unirme al piloto", joined:"Participas en", progress:"Progreso", complete:"Marcar como completado", undo:"Reabrir", welcome:"Conoce la plataforma", profile:"Revisa idioma y perfil", accessibility:"Configura accesibilidad", route:"Planifica una ruta", ticket:"Compra y activa un billete demo", feedback:"Envía tu opinión", finished:"Onboarding completado" },
  en: { title:"Pilot guide", subtitle:"Complete these steps to try every SMAP feature.", invite:"Invitation code", join:"Join pilot", joined:"You are participating in", progress:"Progress", complete:"Mark complete", undo:"Reopen", welcome:"Discover the platform", profile:"Review language and profile", accessibility:"Configure accessibility", route:"Plan a journey", ticket:"Buy and activate a demo ticket", feedback:"Send your feedback", finished:"Onboarding completed" },
} as const;

const steps = ["welcome", "profile", "accessibility", "route", "ticket", "feedback"] as const;
type OnboardingStep = (typeof steps)[number];

export function OnboardingPanel({ locale }: { locale: Locale }) {
  const t = labels[locale];
  const [data, setData] = useState<OnboardingState | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await jsonFetch<OnboardingState>("/api/onboarding"));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggle(step: OnboardingStep, completed: boolean) {
    try {
      setData(await jsonFetch<OnboardingState>("/api/onboarding", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step, completed }),
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error");
    }
  }

  async function redeem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const result = await jsonFetch<{ cohortName: string }>("/api/pilot/invite/redeem", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }),
      });
      setStatus(`${t.joined}: ${result.cohortName}`);
      setCode("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error");
    }
  }

  if (!data) return <section className="content-card"><p>{error || "…"}</p></section>;
  const names: Record<OnboardingStep, string> = { welcome:t.welcome, profile:t.profile, accessibility:t.accessibility, route:t.route, ticket:t.ticket, feedback:t.feedback };

  return <div className="onboarding-layout">
    <section className="content-card">
      <h2>{t.title}</h2><p className="muted">{t.subtitle}</p>
      {data.membership
        ? <div className="pilot-membership"><strong>{t.joined}: {data.membership.cohortName}</strong><span>{data.membership.cohortCode}</span></div>
        : <form className="inline-form" onSubmit={redeem}><label>{t.invite}<input value={code} onChange={(event: ChangeEvent<HTMLInputElement>) => setCode(event.target.value.toUpperCase())} placeholder="SMAP-…" required minLength={6} /></label><button className="primary-button">{t.join}</button></form>}
      {status && <p className="success-message">{status}</p>}{error && <p className="form-error">{error}</p>}
    </section>
    <section className="content-card">
      <div className="section-heading"><div><h2>{t.progress}</h2><p>{data.completed}/{data.total}</p></div><strong>{data.percentage}%</strong></div>
      <div className="progress-track" aria-label={`${data.percentage}%`}><span style={{ width: `${data.percentage}%` }} /></div>
      {data.completedAt && <p className="success-message">{t.finished}</p>}
      <div className="onboarding-steps">{steps.map((step, index) => {
        const completed = data.progress[step];
        return <article key={step} className={completed ? "completed" : ""}><span>{completed ? "✓" : index + 1}</span><strong>{names[step]}</strong><button className="secondary-button" onClick={() => toggle(step, !completed)}>{completed ? t.undo : t.complete}</button></article>;
      })}</div>
    </section>
  </div>;
}
