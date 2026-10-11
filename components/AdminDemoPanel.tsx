"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { jsonFetch } from "@/lib/client";
import type { AdminDemoState, BusOperationalStatus, Locale } from "@/lib/types";

const labels = {
  es: {
    title: "Control de la demostración", subtitle: "Modifica el servicio en tiempo real durante una presentación.",
    global: "Simulación global", speed: "Velocidad", paused: "Pausar todos los autobuses", save: "Guardar",
    buses: "Control de autobuses", status: "Estado", occupancy: "Ocupación fija", automatic: "Automática", busSpeed: "Velocidad del bus",
    in_service: "En servicio", stopped: "Detenido", out_of_service: "Fuera de servicio", gps_lost: "Señal GPS perdida",
    actions: "Acciones rápidas", notice: "Generar aviso de servicio", expire: "Caducar último billete", reset: "Restablecer demostración",
    saved: "Cambios guardados", confirmReset: "¿Restablecer toda la simulación?", loading: "Cargando controles…",
  },
  en: {
    title: "Demo control", subtitle: "Change live service conditions during a presentation.",
    global: "Global simulation", speed: "Speed", paused: "Pause all buses", save: "Save",
    buses: "Bus controls", status: "Status", occupancy: "Fixed occupancy", automatic: "Automatic", busSpeed: "Bus speed",
    in_service: "In service", stopped: "Stopped", out_of_service: "Out of service", gps_lost: "GPS signal lost",
    actions: "Quick actions", notice: "Create service notice", expire: "Expire latest ticket", reset: "Reset demo",
    saved: "Changes saved", confirmReset: "Reset the whole simulation?", loading: "Loading controls…",
  },
} as const;

export function AdminDemoPanel({ locale, onChanged }: { locale: Locale; onChanged: () => void }) {
  const t = labels[locale];
  const [state, setState] = useState<AdminDemoState | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setState(await jsonFetch<AdminDemoState>("/api/admin/demo"));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveSettings() {
    if (!state) return;
    await jsonFetch("/api/admin/demo/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.settings),
    });
    setMessage(t.saved); onChanged(); await load();
  }

  async function saveBus(busId: string) {
    const bus = state?.buses.find((item) => item.busId === busId);
    if (!bus) return;
    await jsonFetch(`/api/admin/demo/buses/${busId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bus),
    });
    setMessage(t.saved); onChanged(); await load();
  }

  async function action(name: "service_notification" | "expire_ticket" | "reset") {
    if (name === "reset" && !window.confirm(t.confirmReset)) return;
    try {
      await jsonFetch("/api/admin/demo/actions", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: name }),
      });
      setMessage(t.saved); setError(""); onChanged(); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Error"); }
  }

  if (!state) return <section className="content-card"><p>{error || t.loading}</p></section>;

  return <div className="admin-layout">
    <section className="content-card admin-intro">
      <span className="status-pill">ADMIN DEMO</span><h2>{t.title}</h2><p>{t.subtitle}</p>
      {message && <p className="success-message" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>

    <section className="content-card">
      <h2>{t.global}</h2>
      <div className="admin-global-grid">
        <label>{t.speed}
          <select value={state.settings.simulationSpeed} onChange={(event: ChangeEvent<HTMLSelectElement>) => setState({ ...state, settings: { ...state.settings, simulationSpeed: Number(event.target.value) } })}>
            {[.25, .5, 1, 2, 4].map((speed) => <option key={speed} value={speed}>{speed}×</option>)}
          </select>
        </label>
        <label className="switch-row admin-switch"><span><strong>{t.paused}</strong></span><input type="checkbox" checked={state.settings.paused} onChange={(event: ChangeEvent<HTMLInputElement>) => setState({ ...state, settings: { ...state.settings, paused: event.target.checked } })} /></label>
        <button className="primary-button" onClick={saveSettings}>{t.save}</button>
      </div>
    </section>

    <section className="content-card">
      <h2>{t.buses}</h2>
      <div className="admin-bus-grid">{state.buses.map((bus) => <article className="admin-bus-card" key={bus.busId}>
        <header><span className="line-badge">{bus.lineCode}</span><div><strong>{bus.code}</strong><small>{t[bus.operationalStatus]}</small></div></header>
        <label>{t.status}<select value={bus.operationalStatus} onChange={(event: ChangeEvent<HTMLSelectElement>) => setState({ ...state, buses: state.buses.map((item) => item.busId === bus.busId ? { ...item, operationalStatus: event.target.value as BusOperationalStatus } : item) })}>
          {(["in_service", "stopped", "out_of_service", "gps_lost"] as const).map((status) => <option key={status} value={status}>{t[status]}</option>)}
        </select></label>
        <label>{t.busSpeed}<select value={bus.speedMultiplier} onChange={(event: ChangeEvent<HTMLSelectElement>) => setState({ ...state, buses: state.buses.map((item) => item.busId === bus.busId ? { ...item, speedMultiplier: Number(event.target.value) } : item) })}>
          {[.5, 1, 1.5, 2].map((speed) => <option key={speed} value={speed}>{speed}×</option>)}
        </select></label>
        <label>{t.occupancy}<select value={bus.occupancyOverride ?? ""} onChange={(event: ChangeEvent<HTMLSelectElement>) => setState({ ...state, buses: state.buses.map((item) => item.busId === bus.busId ? { ...item, occupancyOverride: event.target.value === "" ? null : Number(event.target.value) } : item) })}>
          <option value="">{t.automatic}</option>{[10, 35, 60, 85, 100].map((value) => <option key={value} value={value}>{value}%</option>)}
        </select></label>
        <button className="secondary-button" onClick={() => saveBus(bus.busId)}>{t.save}</button>
      </article>)}</div>
    </section>

    <section className="content-card">
      <h2>{t.actions}</h2>
      <div className="admin-actions"><button className="secondary-button" onClick={() => action("service_notification")}>{t.notice}</button><button className="secondary-button" onClick={() => action("expire_ticket")}>{t.expire}</button><button className="danger-button" onClick={() => action("reset")}>{t.reset}</button></div>
    </section>
  </div>;
}
