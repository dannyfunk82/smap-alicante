"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { copy } from "@/lib/i18n";
import { jsonFetch } from "@/lib/client";
import type { AccessibilityPreferences, BusLive, DashboardUser, JourneyOption, Locale, NetworkResponse, PublicSystemStatus, Stop, PrivacyState } from "@/lib/types";
import { MapPanel } from "@/components/MapPanel";
import { SearchPanel } from "@/components/SearchPanel";
import { TicketsPanel } from "@/components/TicketsPanel";
import { FavoritesPanel } from "@/components/FavoritesPanel";
import { ProfilePanel, applyPreferences } from "@/components/ProfilePanel";
import { JourneyPlannerPanel, type PlannerPreset } from "@/components/JourneyPlannerPanel";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { StopDetailPanel } from "@/components/StopDetailPanel";
import { AdminDemoPanel } from "@/components/AdminDemoPanel";
import { OverviewPanel } from "@/components/OverviewPanel";
import { OperationsPanel } from "@/components/OperationsPanel";
import { IntegrationsPanel } from "@/components/IntegrationsPanel";
import { SystemPanel } from "@/components/SystemPanel";
import { PrivacyPanel } from "@/components/PrivacyPanel";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { PilotPanel } from "@/components/PilotPanel";
import { OnboardingPanel } from "@/components/OnboardingPanel";
import { SupportPanel } from "@/components/SupportPanel";
import { PilotOperationsPanel } from "@/components/PilotOperationsPanel";
import { CampaignsPanel } from "@/components/CampaignsPanel";
import { CampaignOperationsPanel } from "@/components/CampaignOperationsPanel";
import { PilotResultsPanel } from "@/components/PilotResultsPanel";
import { PilotClosurePanel } from "@/components/PilotClosurePanel";
import { GoLivePanel } from "@/components/GoLivePanel";
import { ReleaseOperationsPanel } from "@/components/ReleaseOperationsPanel";
import { OperationalContinuityPanel } from "@/components/OperationalContinuityPanel";
import { HandoverPanel } from "@/components/HandoverPanel";

type SectionId = "overview" | "map" | "planner" | "search" | "tickets" | "favorites" | "onboarding" | "campaigns" | "results" | "support" | "feedback" | "privacy" | "notifications" | "profile" | "admin" | "operations" | "integrations" | "system" | "pilot" | "pilotOps" | "campaignOps" | "closure" | "goLive" | "releaseOps" | "continuity" | "handover";

export function DashboardShell({ user }: { user: DashboardUser }) {
  const [locale, setLocaleState] = useState<Locale>(user.language);
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(user.preferences);
  const [network, setNetwork] = useState<NetworkResponse | null>(null);
  const [active, setActive] = useState<SectionId>("overview");
  const [error, setError] = useState("");
  const [lineFilter, setLineFilter] = useState("all");
  const [selectedBus, setSelectedBus] = useState<BusLive | null>(null);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [favoritesVersion, setFavoritesVersion] = useState(0);
  const [notificationsVersion, setNotificationsVersion] = useState(0);
  const [overviewVersion, setOverviewVersion] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [plannerPreset, setPlannerPreset] = useState<PlannerPreset>({});
  const [plannedJourney, setPlannedJourney] = useState<JourneyOption | null>(null);
  const [systemStatus, setSystemStatus] = useState<PublicSystemStatus | null>(null);
  const [analyticsConsent, setAnalyticsConsent] = useState(user.privacy.analyticsConsent);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({ ticketing: true, feedback: true, campaigns: true, pilot_results: true });
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const firstRender = useRef(true);
  const t = copy[locale];
  const handlePrivacyChanged = useCallback((state: PrivacyState) => setAnalyticsConsent(state.analyticsConsent), []);

  const load = useCallback(async () => {
    try {
      const data = await jsonFetch<NetworkResponse>(`/api/dashboard?lang=${locale}`);
      setNetwork(data);
      setError("");
      setSelectedBus((current) => current ? data.buses.find((bus) => bus.id === current.id) ?? null : null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error");
    }
  }, [locale]);

  const loadSystemStatus = useCallback(() => {
    jsonFetch<PublicSystemStatus>(`/api/status?lang=${locale}`)
      .then(setSystemStatus)
      .catch(() => undefined);
  }, [locale]);

  const loadUnread = useCallback(() => {
    jsonFetch<{ unreadCount: number }>(`/api/notifications?lang=${locale}`)
      .then((data) => setUnreadCount(data.unreadCount))
      .catch(() => undefined);
  }, [locale]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    loadSystemStatus();
    const timer = window.setInterval(loadSystemStatus, 30000);
    return () => window.clearInterval(timer);
  }, [loadSystemStatus]);

  const loadFeatureFlags = useCallback(() => {
    jsonFetch<{ features?: Record<string, boolean> }>("/api/config").then((value) => setFeatureFlags((current) => ({ ...current, ...(value.features ?? {}) }))).catch(() => undefined);
  }, []);

  useEffect(() => { loadFeatureFlags(); }, [loadFeatureFlags]);

  useEffect(() => {
    loadUnread();
    const timer = window.setInterval(loadUnread, 20000);
    return () => window.clearInterval(timer);
  }, [loadUnread, notificationsVersion]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.setAttribute("translate", "no");
    document.documentElement.classList.add("notranslate");
    document.body.setAttribute("translate", "no");
    document.body.classList.add("notranslate");
  }, [locale]);

  useEffect(() => applyPreferences(preferences), [preferences]);

  useEffect(() => {
    if (!analyticsConsent) return;
    void fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventName: "section_viewed", section: active }) });
  }, [active, analyticsConsent]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [active]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      const element = event.target as HTMLElement | null;
      if (element?.matches("input, select, textarea, [contenteditable='true']")) return;
      const shortcut: Record<string, SectionId> = { "1": "overview", "2": "map", "3": "planner", "4": "search", "5": "tickets" };
      const destination = shortcut[event.key];
      if (!destination) return;
      event.preventDefault();
      setActive(destination);
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const summary = useMemo(() => network ? `${network.stopCount} ${t.stops} · ${network.busCount} ${t.buses}` : "…", [network, t]);
  const title: Record<SectionId, string> = {
    overview: t.overview,
    map: t.map,
    planner: t.planner,
    search: t.search,
    tickets: t.tickets,
    favorites: t.favorites,
    onboarding: t.onboarding,
    campaigns: t.campaigns,
    results: t.results,
    support: t.support,
    feedback: t.feedback,
    privacy: t.privacy,
    notifications: t.notifications,
    profile: t.profile,
    admin: t.adminDemo,
    operations: t.operations,
    integrations: t.integrations,
    system: t.system,
    pilot: t.pilot,
    pilotOps: t.pilotOps,
    campaignOps: t.campaignOps,
    closure: t.closure,
    goLive: t.goLive,
    releaseOps: t.releaseOps,
    continuity: t.continuity,
    handover: t.handover,
  };
  const buses = (network?.buses ?? [])
    .filter((bus) => lineFilter === "all" || bus.lineId === lineFilter)
    .sort((a, b) => Number(a.operationalStatus !== "in_service") - Number(b.operationalStatus !== "in_service") || a.etaSeconds - b.etaSeconds);
  const eta = (bus: BusLive) => {
    if (network?.simulation.paused) return t.simulationPaused;
    if (bus.operationalStatus === "stopped") return t.busStopped;
    if (bus.operationalStatus === "out_of_service") return t.outOfService;
    if (bus.operationalStatus === "gps_lost") return t.gpsLost;
    return bus.etaSeconds < 60 ? t.arriving : `${Math.ceil(bus.etaSeconds / 60)} ${t.minutes}`;
  };
  const serviceLabel = network?.simulation.serviceStatus === "paused" ? t.simulationPaused : network?.simulation.serviceStatus === "degraded" ? t.degradedService : t.normalService;
  const serviceIcon = network?.simulation.serviceStatus === "normal" ? "✓" : "!";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  async function setLocale(value: Locale) {
    setLocaleState(value);
    await jsonFetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: value }),
    }).catch(() => undefined);
  }
  async function addFavorite(type: "line" | "stop", entityId: string) {
    await jsonFetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, entityId }),
    });
    setFavoritesVersion((value) => value + 1);
    setOverviewVersion((value) => value + 1);
  }
  function planFrom(stop: Stop) {
    setPlannerPreset({ originStopId: stop.id });
    setSelectedStop(null);
    setActive("planner");
  }
  function planTo(stop: Stop) {
    setPlannerPreset({ destinationStopId: stop.id });
    setSelectedStop(null);
    setActive("planner");
  }
  function buyJourney(journey: JourneyOption) {
    setPlannedJourney(journey);
    setActive("tickets");
  }
  function ticketsChanged() {
    setNotificationsVersion((value) => value + 1);
    setOverviewVersion((value) => value + 1);
    loadUnread();
  }
  function navigate(section: Exclude<SectionId, "profile" | "admin">) {
    setActive(section);
  }

  const navItems: [SectionId, string, string][] = [
    ["overview", "⌂", t.overview],
    ["map", "⌖", t.map],
    ["planner", "↔", t.planner],
    ["search", "⌕", t.search],
    ...(featureFlags.ticketing !== false ? [["tickets", "▣", t.tickets] as [SectionId, string, string]] : []),
    ["favorites", "☆", t.favorites],
    ["onboarding", "✓", t.onboarding],
    ...(featureFlags.campaigns !== false ? [["campaigns", "▦", t.campaigns] as [SectionId, string, string]] : []),
    ...(featureFlags.pilot_results !== false ? [["results", "◒", t.results] as [SectionId, string, string]] : []),
    ["support", "?", t.support],
    ...(featureFlags.feedback !== false ? [["feedback", "✦", t.feedback] as [SectionId, string, string]] : []),
    ["privacy", "◈", t.privacy],
    ["profile", "○", t.profile],
    ...(user.role === "admin" ? [["admin", "⚙", t.adminDemo] as [SectionId, string, string], ["operations", "▤", t.operations] as [SectionId, string, string], ["integrations", "⇄", t.integrations] as [SectionId, string, string], ["system", "◉", t.system] as [SectionId, string, string], ["pilot", "◎", t.pilot] as [SectionId, string, string], ["pilotOps", "◫", t.pilotOps] as [SectionId, string, string], ["campaignOps", "▦", t.campaignOps] as [SectionId, string, string], ["closure", "◆", t.closure] as [SectionId, string, string], ["goLive", "⬢", t.goLive] as [SectionId, string, string], ["releaseOps", "⇧", t.releaseOps] as [SectionId, string, string], ["continuity", "∞", t.continuity] as [SectionId, string, string], ["handover", "✓", t.handover] as [SectionId, string, string]] : []),
  ];

  return <main id="main-content" className="dashboard">
    <aside className="sidebar"><div><div className="sidebar-brand"><span className="brand-mark small">S</span><div><strong>SMAP</strong><span>Alicante</span></div></div><nav aria-label={locale === "es" ? "Navegación principal" : "Main navigation"}>
      {navItems.map(([id, icon, label]) => <button key={id} aria-current={active === id ? "page" : undefined} className={active === id ? "nav-button active" : "nav-button"} onClick={() => setActive(id)} title={`${label}${["overview", "map", "planner", "search", "tickets"].includes(id) ? ` · Alt+${["overview", "map", "planner", "search", "tickets"].indexOf(id) + 1}` : ""}`}><span aria-hidden="true">{icon}</span>{label}</button>)}
    </nav></div><button className="logout-button" onClick={logout}>{t.logout}</button></aside>

    <section className="workspace">
      <header className="topbar"><div><p className="eyebrow">{t.brand}</p><h1 ref={headingRef} tabIndex={-1}>{title[active]}</h1></div><div className="topbar-actions"><span className="live-pill"><i />LIVE</span><button className="notification-button" onClick={() => setActive("notifications")} aria-label={`${t.notifications}: ${unreadCount} ${t.unread}`}><span aria-hidden="true">🔔</span>{unreadCount > 0 && <b>{unreadCount}</b>}</button><div className="language-toggle" role="group" aria-label={t.language}><button className={locale === "es" ? "selected" : ""} onClick={() => setLocale("es")}>ES</button><button className={locale === "en" ? "selected" : ""} onClick={() => setLocale("en")}>EN</button></div><div className="user-chip"><span>{user.name}</span><small>{user.email}</small></div></div></header>
      <div className="sr-only" aria-live="polite">{title[active]}</div>
      {systemStatus && (systemStatus.maintenance.enabled || systemStatus.incidents.length > 0 || systemStatus.message) && <section className={`system-banner ${systemStatus.state}`} role="status"><div><strong>{systemStatus.maintenance.enabled ? systemStatus.maintenance.title : systemStatus.incidents[0]?.title ?? t.systemStatus}</strong><span>{systemStatus.maintenance.enabled ? systemStatus.maintenance.message : systemStatus.incidents[0]?.body ?? systemStatus.message}</span></div>{user.role === "admin" && <button className="secondary-button" onClick={() => setActive("system")}>{t.viewSystem}</button>}</section>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!network ? <section className="content-card"><div className="empty-state">{t.loading}</div></section>
        : active === "overview" ? <OverviewPanel network={network} locale={locale} version={overviewVersion + notificationsVersion + favoritesVersion} onNavigate={navigate} />
        : active === "map" ? <div className="map-layout">
          <section className="map-card"><div className="map-toolbar"><div className="segmented compact-segment"><button className={lineFilter === "all" ? "selected" : ""} onClick={() => setLineFilter("all")}>ALL</button>{network.lines.map((line) => <button key={line.id} className={lineFilter === line.id ? "selected" : ""} onClick={() => setLineFilter(line.id)}>{line.code}</button>)}</div><span>{t.liveUpdated}</span></div>{network.staticData.kind === "gtfs" && <div className="real-data-banner"><strong>{locale === "es" ? "Red urbana real de Alicante" : "Real Alicante urban network"}</strong><span>{network.staticData.routeCount} {t.lines.toLowerCase()} · {network.staticData.stopCount} {t.stops}</span>{network.staticData.sourceUrl && <a href={network.staticData.sourceUrl} target="_blank" rel="noreferrer">{network.staticData.attributionText}</a>}<span>{locale === "es" ? "GPS y ocupación simulados" : "Simulated GPS and occupancy"}</span></div>}<MapPanel network={network} locale={locale} lineFilter={lineFilter} onSelectBus={(bus) => { setSelectedBus(bus); setSelectedStop(null); }} onSelectStop={(stop) => { setSelectedStop(stop); setSelectedBus(null); }} /></section>
          <aside className="info-panel"><span className="status-pill">{network.dataSource.active === "external" ? "LIVE API" : network.staticData.kind === "gtfs" ? "GTFS REAL · BUS DEMO" : network.dataSource.active === "mixed" ? "HYBRID" : "LIVE DEMO"}</span><h2>{t.nextArrivals}</h2><p>{summary}</p><div className={`service-mini ${network.simulation.serviceStatus}`}><span>{serviceIcon}</span><div><strong>{serviceLabel}</strong><small>{network.dataSource.fallbackActive ? t.integrationFallback : network.dataSource.active === "external" ? t.externalData : t.demoNotice} · {network.simulation.speed}×</small></div></div><div className="arrival-list">{buses.map((bus) => <button className={selectedBus?.id === bus.id ? "arrival-row selected" : "arrival-row"} key={bus.id} onClick={() => { setSelectedBus(bus); setSelectedStop(null); }}><span className="line-badge" style={{ background: bus.lineColor }}>{bus.lineCode}</span><div><strong>{bus.nextStop.name}</strong><span>{bus.code} · {bus.operationalStatus === "in_service" ? `${t.occupancy}: ${t[bus.occupancyLevel]} ${bus.occupancyPercentage}%` : eta(bus)}</span></div><b>{eta(bus)}</b></button>)}</div>{selectedBus && <div className="bus-detail"><div><span className="line-badge" style={{ background: selectedBus.lineColor }}>{selectedBus.lineCode}</span><strong>{selectedBus.code}</strong></div><dl><div><dt>{t.nextStop}</dt><dd>{selectedBus.nextStop.name}</dd></div><div><dt>ETA</dt><dd>{eta(selectedBus)}</dd></div><div><dt>{t.occupancy}</dt><dd>{t[selectedBus.occupancyLevel]} · {selectedBus.passengerCount}/{selectedBus.capacity}</dd></div><div><dt>{t.direction}</dt><dd>{selectedBus.direction === "outbound" ? t.directionOutbound : t.directionInbound}</dd></div><div><dt>{t.serviceStatus}</dt><dd>{eta(selectedBus)}</dd></div></dl><div className="occupancy-bar" aria-label={`${t.occupancy} ${selectedBus.occupancyPercentage}%`}><span style={{ width: `${selectedBus.occupancyPercentage}%` }} /></div></div>}</aside>
          {selectedStop && <StopDetailPanel network={network} stop={selectedStop} locale={locale} onFavorite={addFavorite} onPlanFrom={planFrom} onPlanTo={planTo} onClose={() => setSelectedStop(null)} />}
        </div>
        : active === "planner" ? <JourneyPlannerPanel network={network} locale={locale} preset={plannerPreset} onBuy={buyJourney} />
        : active === "search" ? <SearchPanel network={network} locale={locale} onFavorite={addFavorite} onOpenStop={(stop) => { setSelectedStop(stop); setActive("map"); }} onPlanTo={planTo} />
        : active === "tickets" ? <TicketsPanel network={network} locale={locale} initialJourney={plannedJourney} onChanged={ticketsChanged} />
        : active === "favorites" ? <FavoritesPanel locale={locale} version={favoritesVersion} onChanged={() => { setFavoritesVersion((value) => value + 1); setOverviewVersion((value) => value + 1); }} />
        : active === "notifications" ? <NotificationsPanel locale={locale} version={notificationsVersion} onUnreadChange={setUnreadCount} />
        : active === "onboarding" ? <OnboardingPanel locale={locale} />
        : active === "campaigns" ? <CampaignsPanel locale={locale} onChanged={() => { setNotificationsVersion((value) => value + 1); loadUnread(); }} />
        : active === "results" ? <PilotResultsPanel locale={locale} />
        : active === "support" ? <SupportPanel locale={locale} />
        : active === "feedback" ? <FeedbackPanel locale={locale} network={network} />
        : active === "privacy" ? <PrivacyPanel locale={locale} onChanged={handlePrivacyChanged} />
        : active === "operations" && user.role === "admin" ? <OperationsPanel locale={locale} />
        : active === "integrations" && user.role === "admin" ? <IntegrationsPanel locale={locale} onChanged={() => { void load(); setOverviewVersion((value) => value + 1); }} />
        : active === "system" && user.role === "admin" ? <SystemPanel locale={locale} onStatusChanged={() => { loadSystemStatus(); setOverviewVersion((value) => value + 1); }} />
        : active === "pilot" && user.role === "admin" ? <PilotPanel locale={locale} />
        : active === "pilotOps" && user.role === "admin" ? <PilotOperationsPanel locale={locale} />
        : active === "campaignOps" && user.role === "admin" ? <CampaignOperationsPanel locale={locale} />
        : active === "closure" && user.role === "admin" ? <PilotClosurePanel locale={locale} />
        : active === "goLive" && user.role === "admin" ? <GoLivePanel locale={locale} onFlagsChanged={loadFeatureFlags} />
        : active === "releaseOps" && user.role === "admin" ? <ReleaseOperationsPanel locale={locale} />
        : active === "continuity" && user.role === "admin" ? <OperationalContinuityPanel locale={locale} />
        : active === "handover" && user.role === "admin" ? <HandoverPanel locale={locale} />
        : active === "admin" && user.role === "admin" ? <AdminDemoPanel locale={locale} onChanged={() => { void load(); setNotificationsVersion((value) => value + 1); setOverviewVersion((value) => value + 1); loadUnread(); }} />
        : <ProfilePanel user={user} locale={locale} setLocale={setLocale} preferences={preferences} onPreferencesChange={setPreferences} />}
    </section>
  </main>;
}
