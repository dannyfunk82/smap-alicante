"use client";

import { useEffect, useState } from "react";
import { jsonFetch } from "@/lib/client";
import { copy } from "@/lib/i18n";
import type { Locale, NotificationItem } from "@/lib/types";

export function NotificationsPanel({ locale, version, onUnreadChange }: { locale: Locale; version: number; onUnreadChange: (count: number) => void }) {
  const t = copy[locale];
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true);
    try { const data = await jsonFetch<{ notifications: NotificationItem[]; unreadCount: number }>(`/api/notifications?lang=${locale}`); setItems(data.notifications); onUnreadChange(data.unreadCount); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [locale, version]);
  async function read(id: string) { await jsonFetch(`/api/notifications/${id}/read`, { method: "PATCH" }); await load(); }
  async function readAll() { await jsonFetch("/api/notifications/read-all", { method: "PATCH" }); await load(); }
  return <section className="content-card">
    <div className="section-heading"><div><span className="status-pill">INBOX</span><h2>{t.notifications}</h2></div><button className="secondary-button compact" onClick={readAll}>{t.allRead}</button></div>
    {loading ? <div className="empty-state">{t.loading}</div> : error ? <p className="form-error">{error}</p> : items.length ? <div className="notification-list">{items.map((item) => <article key={item.id} className={item.readAt ? "notification-card" : "notification-card unread"}>
      <span className="notification-icon" aria-hidden="true">{item.type.includes("ticket") ? "🎫" : "●"}</span>
      <div><strong>{item.title}</strong><p>{item.body}</p><time>{new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</time></div>
      {!item.readAt && <button className="secondary-button compact" onClick={() => read(item.id)}>{t.markRead}</button>}
    </article>)}</div> : <div className="empty-state">🔔<strong>{t.noNotifications}</strong></div>}
  </section>;
}
