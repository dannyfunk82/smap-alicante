"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { jsonFetch } from "@/lib/client";
import { copy } from "@/lib/i18n";
import type { JourneyOption, Locale, NetworkResponse, Ticket } from "@/lib/types";
import { fareForStops } from "@/lib/domain.js";

export function TicketsPanel({
  network,
  locale,
  initialJourney,
  onChanged,
}: {
  network: NetworkResponse;
  locale: Locale;
  initialJourney?: JourneyOption | null;
  onChanged?: () => void;
}) {
  const t = copy[locale];
  const [lineId, setLineId] = useState(initialJourney?.lineId ?? network.lines[0]?.id ?? "");
  const line = network.lines.find((item) => item.id === lineId) ?? network.lines[0];
  const [origin, setOrigin] = useState(initialJourney?.originStopId ?? line?.stops[0]?.id ?? "");
  const [destination, setDestination] = useState(initialJourney?.destinationStopId ?? line?.stops.at(-1)?.id ?? "");
  const [type, setType] = useState<"single" | "return" | "daily">("single");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [tab, setTab] = useState<"current" | "past">("current");

  const load = () => jsonFetch<{ tickets: Ticket[] }>(`/api/tickets?lang=${locale}`).then((data) => setTickets(data.tickets)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [locale]);
  useEffect(() => {
    if (!initialJourney) return;
    setLineId(initialJourney.lineId);
    setOrigin(initialJourney.originStopId);
    setDestination(initialJourney.destinationStopId);
  }, [initialJourney]);
  useEffect(() => {
    if (!line) return;
    setOrigin((current) => line.stops.some((stop) => stop.id === current) ? current : line.stops[0]?.id ?? "");
    setDestination((current) => line.stops.some((stop) => stop.id === current) ? current : line.stops.at(-1)?.id ?? "");
  }, [line]);

  const originSeq = line?.stops.find((stop) => stop.id === origin)?.sequence ?? 0;
  const destSeq = line?.stops.find((stop) => stop.id === destination)?.sequence ?? 0;
  const stopCount = Math.abs(destSeq - originSeq);
  const price = fareForStops(stopCount, type);
  const formatter = useMemo(() => new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-GB", { style: "currency", currency: "EUR" }), [locale]);
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { dateStyle: "medium", timeStyle: "short" }), [locale]);
  const visibleTickets = tickets.filter((ticket) => tab === "current" ? ["available", "active"].includes(ticket.status) : !["available", "active"].includes(ticket.status));

  async function confirmPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const number = String(form.get("cardNumber") ?? "").replace(/\s/g, "");
    const holder = String(form.get("holder") ?? "").trim();
    const expiry = String(form.get("expiry") ?? "").trim();
    const cvv = String(form.get("cvv") ?? "").trim();
    if (holder.length < 3 || !/^\d{16}$/.test(number) || !/^\d{2}\/\d{2}$/.test(expiry) || !/^\d{3}$/.test(cvv)) { setError(t.invalidPayment); return; }
    setBusy(true); setError("");
    try {
      const result = await jsonFetch<{ publicCode: string; paymentReference: string }>("/api/tickets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineId: line?.id, originStopId: origin, destinationStopId: destination, ticketType: type }),
      });
      setPaymentSuccess(`${t.paymentApproved}: ${result.publicCode}`);
      setPaymentOpen(false);
      await load();
      onChanged?.();
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setBusy(false); }
  }

  async function activate(id: string) {
    try { await jsonFetch(`/api/tickets/${id}/activate`, { method: "POST" }); await load(); setSelected(null); onChanged?.(); }
    catch (e) { setError(e instanceof Error ? e.message : "Error"); }
  }

  function expiryText(ticket: Ticket) {
    if (!ticket.expiresAt) return "";
    const minutes = Math.max(0, Math.ceil((new Date(ticket.expiresAt).getTime() - Date.now()) / 60000));
    return `${t.expiresIn} ${minutes} ${t.minutes}`;
  }

  return <div className="tickets-layout">
    <section className="content-card purchase-card">
      <div className="section-heading"><div><span className="status-pill">DEMO PAY</span><h2>{t.buyTicket}</h2></div></div>
      <div className="form-grid">
        <label>{t.lines}<select value={lineId} onChange={(e: ChangeEvent<HTMLSelectElement>) => { setLineId(e.target.value); }}>{network.lines.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
        <label>{t.origin}<select value={origin} onChange={(e: ChangeEvent<HTMLSelectElement>) => setOrigin(e.target.value)}>{line?.stops.map((stop) => <option key={stop.id} value={stop.id}>{stop.sequence}. {stop.name}</option>)}</select></label>
        <label>{t.destination}<select value={destination} onChange={(e: ChangeEvent<HTMLSelectElement>) => setDestination(e.target.value)}>{line?.stops.map((stop) => <option key={stop.id} value={stop.id}>{stop.sequence}. {stop.name}</option>)}</select></label>
        <fieldset><legend>{t.ticketType}</legend><div className="ticket-types">{(["single", "return", "daily"] as const).map((item) => <button type="button" className={type === item ? "selected" : ""} key={item} onClick={() => setType(item)}>{t[item]}</button>)}</div></fieldset>
      </div>
      <div className="purchase-summary"><div><span>{stopCount} {t.stops}</span><strong>{formatter.format(price)}</strong></div><p>{t.demoPayment}</p><button className="primary-button" onClick={() => { setError(""); setPaymentOpen(true); }} disabled={stopCount < 1}>{t.purchaseButton}</button></div>
      {paymentSuccess && <p className="inline-message" role="status">{paymentSuccess}</p>}
      {error && <p className="form-error">{error}</p>}
    </section>

    <section className="content-card">
      <div className="section-heading"><div><span className="status-pill">{t.wallet.toUpperCase()}</span><h2>{t.tickets}</h2></div><p>{tickets.length}</p></div>
      <div className="segmented wallet-tabs"><button className={tab === "current" ? "selected" : ""} onClick={() => setTab("current")}>{t.currentTickets}</button><button className={tab === "past" ? "selected" : ""} onClick={() => setTab("past")}>{t.pastTickets}</button></div>
      {visibleTickets.length ? <div className="ticket-list">{visibleTickets.map((ticket) => <article className="ticket-card" key={ticket.id}>
        <div className="ticket-route"><span className={`ticket-status ${ticket.status}`}>{t[ticket.status]}</span><strong>{ticket.lineCode} · {t[ticket.ticketType]}</strong><span>{ticket.originName} → {ticket.destinationName}</span>{ticket.status === "active" && <em>{expiryText(ticket)}</em>}</div>
        <div className="ticket-meta"><strong>{formatter.format(ticket.price)}</strong><span>{ticket.publicCode}</span><span>{t.purchasedOn}: {dateFormatter.format(new Date(ticket.purchasedAt))}</span></div>
        <div className="ticket-actions">{ticket.status === "available" && <button className="primary-button compact" onClick={() => activate(ticket.id)}>{t.activate}</button>}<button className="secondary-button compact" onClick={() => setSelected(ticket)}>{t.showQr}</button></div>
      </article>)}</div> : <div className="empty-state">🎫<strong>{t.noTickets}</strong><span>{t.buyTicket}</span></div>}
    </section>

    {paymentOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="payment-title"><form className="payment-modal" onSubmit={confirmPayment}>
      <button className="modal-close" type="button" onClick={() => setPaymentOpen(false)} aria-label={t.close}>×</button>
      <span className="status-pill">DEMO</span><h3 id="payment-title">{t.paymentTitle}</h3>
      <div className="payment-total"><span>{line?.code} · {stopCount} {t.stops}</span><strong>{formatter.format(price)}</strong></div>
      <label>{t.cardHolder}<input name="holder" defaultValue="SMAP Demo User" autoComplete="cc-name" /></label>
      <label>{t.cardNumber}<input name="cardNumber" defaultValue="4242 4242 4242 4242" inputMode="numeric" autoComplete="cc-number" /></label>
      <div className="payment-row"><label>{t.expiry}<input name="expiry" defaultValue="12/30" inputMode="numeric" autoComplete="cc-exp" /></label><label>{t.cvv}<input name="cvv" defaultValue="123" inputMode="numeric" autoComplete="cc-csc" /></label></div>
      <p>{t.demoPayment}</p><button className="primary-button" disabled={busy}>{busy ? "…" : t.payNow}</button>
    </form></div>}

    {selected && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="QR"><div className="qr-modal"><button className="modal-close" onClick={() => setSelected(null)} aria-label={t.close}>×</button><span className={`ticket-status ${selected.status}`}>{t[selected.status]}</span><h3>{selected.lineCode} · {selected.publicCode}</h3><img src={`/api/tickets/${selected.id}/qr`} alt={`QR ${selected.publicCode}`} width="280" height="280" /><p>{selected.originName} → {selected.destinationName}</p>{selected.paymentReference && <small>{selected.paymentReference}</small>}</div></div>}
  </div>;
}
