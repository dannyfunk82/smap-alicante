"use client";

import { useEffect, useMemo, useState } from "react";
import { jsonFetch } from "@/lib/client";
import { copy } from "@/lib/i18n";
import type { Favorite, Locale, NetworkResponse, NotificationItem, Ticket } from "@/lib/types";

type OverviewData = {
  favorites: Favorite[];
  tickets: Ticket[];
  notifications: NotificationItem[];
  unreadCount: number;
};

export function OverviewPanel({
  network,
  locale,
  version,
  onNavigate,
}: {
  network: NetworkResponse;
  locale: Locale;
  version: number;
  onNavigate: (section: "map" | "planner" | "search" | "tickets" | "favorites" | "notifications") => void;
}) {
  const t = copy[locale];
  const [data, setData] = useState<OverviewData>({ favorites: [], tickets: [], notifications: [], unreadCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      jsonFetch<{ favorites: Favorite[] }>(`/api/favorites?lang=${locale}`),
      jsonFetch<{ tickets: Ticket[] }>(`/api/tickets?lang=${locale}`),
      jsonFetch<{ notifications: NotificationItem[]; unreadCount: number }>(`/api/notifications?lang=${locale}`),
    ]).then(([favorites, tickets, notifications]) => {
      if (!active) return;
      setData({ favorites: favorites.favorites, tickets: tickets.tickets, notifications: notifications.notifications, unreadCount: notifications.unreadCount });
      setError("");
    }).catch((cause) => active && setError(cause instanceof Error ? cause.message : "Error"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [locale, version]);

  const liveBuses = network.buses.filter((bus) => bus.operationalStatus === "in_service" && bus.dataFreshness === "live");
  const nextBuses = [...liveBuses].sort((a, b) => a.etaSeconds - b.etaSeconds).slice(0, 4);
  const currentTickets = data.tickets.filter((ticket) => ticket.status === "available" || ticket.status === "active");
  const serviceLabel = network.simulation.serviceStatus === "normal" ? t.normalService : network.simulation.serviceStatus === "paused" ? t.simulationPaused : t.degradedService;
  const latestNotification = data.notifications[0];
  const formatter = useMemo(() => new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-GB", { style: "currency", currency: "EUR" }), [locale]);

  if (loading) return <section className="content-card"><div className="empty-state">{t.loading}</div></section>;
  if (error) return <section className="content-card"><p className="form-error" role="alert">{error}</p></section>;

  return <div className="overview-layout">
    <section className="overview-hero">
      <div><span className="status-pill">SMAP LIVE</span><h2>{t.overviewWelcome}</h2><p>{t.overviewSubtitle}</p></div>
      <div className={`service-card ${network.simulation.serviceStatus}`}><span aria-hidden="true">{network.simulation.serviceStatus === "normal" ? "✓" : "!"}</span><div><strong>{serviceLabel}</strong><small>{network.busCount} {t.buses} · {network.stopCount} {t.stops}</small></div></div>
    </section>

    <section className="metric-grid" aria-label={t.overviewMetrics}>
      <button className="metric-card" onClick={() => onNavigate("map")}><span aria-hidden="true">🚌</span><strong>{liveBuses.length}</strong><small>{t.liveBuses}</small></button>
      <button className="metric-card" onClick={() => onNavigate("favorites")}><span aria-hidden="true">☆</span><strong>{data.favorites.length}</strong><small>{t.favorites}</small></button>
      <button className="metric-card" onClick={() => onNavigate("tickets")}><span aria-hidden="true">🎫</span><strong>{currentTickets.length}</strong><small>{t.currentTickets}</small></button>
      <button className="metric-card" onClick={() => onNavigate("notifications")}><span aria-hidden="true">🔔</span><strong>{data.unreadCount}</strong><small>{t.unread}</small></button>
    </section>

    <div className="overview-columns">
      <section className="content-card">
        <div className="section-heading"><div><span className="status-pill">LIVE</span><h2>{t.nextArrivals}</h2></div><button className="text-button" onClick={() => onNavigate("map")}>{t.viewAll}</button></div>
        <div className="overview-arrivals">{nextBuses.map((bus) => <article key={bus.id}><span className="line-badge" style={{ background: bus.lineColor }}>{bus.lineCode}</span><div><strong>{bus.nextStop.name}</strong><small>{bus.code} · {t[bus.occupancyLevel]} {bus.occupancyPercentage}%</small></div><b>{bus.etaSeconds < 60 ? t.arriving : `${Math.ceil(bus.etaSeconds / 60)} ${t.minutes}`}</b></article>)}</div>
        {!nextBuses.length && <div className="compact-empty">{t.noArrivals}</div>}
      </section>

      <section className="content-card">
        <div className="section-heading"><div><span className="status-pill">QUICK</span><h2>{t.quickActions}</h2></div></div>
        <div className="quick-action-grid">
          <button onClick={() => onNavigate("planner")}><span aria-hidden="true">↔</span><strong>{t.planJourney}</strong><small>{t.planJourneyHint}</small></button>
          <button onClick={() => onNavigate("search")}><span aria-hidden="true">⌕</span><strong>{t.search}</strong><small>{t.searchHint}</small></button>
          <button onClick={() => onNavigate("tickets")}><span aria-hidden="true">▣</span><strong>{t.buyTicket}</strong><small>{currentTickets[0] ? `${t.price}: ${formatter.format(currentTickets[0].price)}` : t.buyTicketHint}</small></button>
        </div>
      </section>
    </div>

    {latestNotification && <section className="content-card latest-notification"><span className="notification-icon" aria-hidden="true">🔔</span><div><small>{t.latestUpdate}</small><strong>{latestNotification.title}</strong><p>{latestNotification.body}</p></div><button className="secondary-button compact" onClick={() => onNavigate("notifications")}>{t.viewAll}</button></section>}
  </div>;
}
