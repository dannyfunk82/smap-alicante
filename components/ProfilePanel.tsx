"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { copy } from "@/lib/i18n";
import { jsonFetch } from "@/lib/client";
import type { AccessibilityPreferences, DashboardUser, Locale, TextScale } from "@/lib/types";

export function applyPreferences(preferences: AccessibilityPreferences) {
  document.body.classList.toggle("high-contrast", preferences.highContrast);
  document.body.classList.toggle("reduce-motion", preferences.reduceMotion);
  document.body.classList.toggle("large-text", preferences.textScale === "large");
  document.body.classList.toggle("xlarge-text", preferences.textScale === "xlarge");
}

export function ProfilePanel({
  user, locale, setLocale, preferences, onPreferencesChange,
}: {
  user: Pick<DashboardUser, "email" | "name">;
  locale: Locale;
  setLocale: (value: Locale) => void;
  preferences: AccessibilityPreferences;
  onPreferencesChange: (value: AccessibilityPreferences) => void;
}) {
  const t = copy[locale];
  const [draft, setDraft] = useState(preferences);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => setDraft(preferences), [preferences]);

  async function save(next: AccessibilityPreferences) {
    setDraft(next); applyPreferences(next); setSaving(true); setMessage(""); setError("");
    try {
      const result = await jsonFetch<{ preferences: AccessibilityPreferences }>("/api/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next),
      });
      onPreferencesChange(result.preferences); setMessage(t.preferencesSaved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error"); applyPreferences(preferences); setDraft(preferences);
    } finally { setSaving(false); }
  }

  function change<K extends keyof AccessibilityPreferences>(key: K, value: AccessibilityPreferences[K]) {
    void save({ ...draft, [key]: value });
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPasswordBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await jsonFetch("/api/profile/password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: String(form.get("currentPassword") ?? ""), newPassword: String(form.get("newPassword") ?? "") }),
      });
      setMessage(t.passwordChanged);
      window.setTimeout(() => { window.location.href = "/login"; }, 900);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Error"); }
    finally { setPasswordBusy(false); }
  }

  return <section className="content-card profile-card">
    <div className="section-heading"><div><span className="status-pill">ACCOUNT</span><h2>{t.profile}</h2></div>{saving && <span className="saving-indicator" role="status">{t.saving}</span>}</div>
    <div className="profile-summary"><div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div><div><strong>{user.name}</strong><span>{user.email}</span></div></div>
    {message && <p className="success-message" role="status">{message}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}

    <fieldset className="settings-group"><legend>{t.language}</legend><div className="segmented"><button className={locale === "es" ? "selected" : ""} onClick={() => setLocale("es")}>Español</button><button className={locale === "en" ? "selected" : ""} onClick={() => setLocale("en")}>English</button></div></fieldset>

    <fieldset className="settings-group"><legend>{t.accessibility}</legend>
      <label className="switch-row"><span><strong>{t.highContrast}</strong><small>{t.highContrastHint}</small></span><input type="checkbox" checked={draft.highContrast} onChange={(event: ChangeEvent<HTMLInputElement>) => change("highContrast", event.target.checked)} /></label>
      <label className="switch-row"><span><strong>{t.reduceMotion}</strong><small>{t.reduceMotionHint}</small></span><input type="checkbox" checked={draft.reduceMotion} onChange={(event: ChangeEvent<HTMLInputElement>) => change("reduceMotion", event.target.checked)} /></label>
      <div className="setting-row"><span><strong>{t.textSize}</strong><small>{t.textSizeHint}</small></span><div className="segmented" role="group" aria-label={t.textSize}>{(["normal", "large", "xlarge"] as TextScale[]).map((scale) => <button key={scale} className={draft.textScale === scale ? "selected" : ""} onClick={() => change("textScale", scale)}>{t[scale]}</button>)}</div></div>
    </fieldset>

    <fieldset className="settings-group"><legend>{t.notificationPreferences}</legend>
      <label className="switch-row"><span><strong>{t.arrivalAlerts}</strong><small>{t.arrivalAlertsHint}</small></span><input type="checkbox" checked={draft.arrivalNotifications} onChange={(event: ChangeEvent<HTMLInputElement>) => change("arrivalNotifications", event.target.checked)} /></label>
      <label className="switch-row"><span><strong>{t.ticketAlerts}</strong><small>{t.ticketAlertsHint}</small></span><input type="checkbox" checked={draft.ticketNotifications} onChange={(event: ChangeEvent<HTMLInputElement>) => change("ticketNotifications", event.target.checked)} /></label>
      <label className="switch-row"><span><strong>{t.serviceAlerts}</strong><small>{t.serviceAlertsHint}</small></span><input type="checkbox" checked={draft.serviceNotifications} onChange={(event: ChangeEvent<HTMLInputElement>) => change("serviceNotifications", event.target.checked)} /></label>
    </fieldset>

    <form className="settings-group password-form" onSubmit={changePassword}><h3>{t.security}</h3><p>{t.passwordPolicy}</p>
      <label>{t.currentPassword}<input name="currentPassword" type="password" autoComplete="current-password" required /></label>
      <label>{t.newPassword}<input name="newPassword" type="password" autoComplete="new-password" required minLength={10} /></label>
      <button className="primary-button" type="submit" disabled={passwordBusy}>{passwordBusy ? "…" : t.changePassword}</button>
    </form>
  </section>;
}
