"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { PlaceWorkspace } from "@/components/place-workspace";
import { ScreenManage } from "@/components/screen-manage";
import { notificationCopy } from "@/lib/notification-copy";
import type {
  ChildAccount,
  NotificationItem,
  NotificationsResponse,
  PlaceItem,
  PlacesResponse,
  PlaceStatsResponse,
  SessionUser,
  TeamPlace,
  TeamPlacesResponse,
  TicketService,
  TicketsBalanceResponse,
  TicketsLedgerResponse,
} from "@/lib/types";

type View =
  | "overview"
  | "places"
  | "tickets"
  | "notifications"
  | "team"
  | "settings";

const NAV_ITEMS: Array<{ id: View; label: string; icon: IconName }> = [
  { id: "overview", label: "홈", icon: "home" },
  { id: "places", label: "플레이스", icon: "pin" },
  { id: "tickets", label: "이용권", icon: "ticket" },
  { id: "notifications", label: "알림", icon: "bell" },
  { id: "team", label: "하위 계정", icon: "users" },
  { id: "settings", label: "화면 관리", icon: "eye" },
];

type IconName =
  | "home"
  | "pin"
  | "ticket"
  | "bell"
  | "users"
  | "sliders"
  | "search"
  | "refresh"
  | "arrow"
  | "check"
  | "logout"
  | "menu"
  | "close"
  | "spark"
  | "eye"
  | "building";

const ICON_PATHS: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  ticket: <><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6Z" /><path d="M13 5v14" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" /><path d="M1 14h6M9 8h6M17 16h6" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  refresh: <><path d="M20 11a8 8 0 1 0-2.34 5.66" /><path d="M20 4v7h-7" /></>,
  arrow: <><path d="m9 18 6-6-6-6" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  spark: <><path d="m12 3-1.2 4.1a5 5 0 0 1-3.4 3.4L3 12l4.4 1.5a5 5 0 0 1 3.4 3.4L12 21l1.2-4.1a5 5 0 0 1 3.4-3.4L21 12l-4.4-1.5a5 5 0 0 1-3.4-3.4Z" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  building: <><path d="M3 21h18M6 21V5l6-2 6 2v16M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4" /></>,
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

function number(value: number | null | undefined) {
  return new Intl.NumberFormat("ko-KR").format(Number(value ?? 0));
}

function dateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function roleLabel(role?: string | null) {
  if (role === "parent") return "부모 계정";
  if (role === "child") return "하위 계정";
  if (role === "admin") return "관리자";
  return role || "";
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="section-description">{description}</p>
      </div>
      {action}
    </div>
  );
}

function ProgressRing({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const safe = Math.min(100, Math.max(0, value));
  return (
    <div
      className="progress-ring"
      style={{ "--progress": `${safe * 3.6}deg` } as React.CSSProperties}
    >
      <div>
        <strong>{Math.round(safe)}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="empty-panel" aria-live="polite">
      <span className="loader" />
      <p>데이터를 불러오고 있습니다.</p>
    </div>
  );
}

export function DashboardShell() {
  const router = useRouter();
  const [view, setView] = useState<View>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<PlaceStatsResponse>({});
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [tickets, setTickets] = useState<TicketsBalanceResponse>({});
  const [ledger, setLedger] = useState<TicketsLedgerResponse>({});
  const [notifications, setNotifications] = useState<NotificationsResponse>({});
  const [children, setChildren] = useState<ChildAccount[]>([]);
  const [teamAvailable, setTeamAvailable] = useState<boolean | null>(null);
  const [allowedPlaces, setAllowedPlaces] = useState<TeamPlace[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildAccount | null>(null);
  const [assignedAliases, setAssignedAliases] = useState<string[]>([]);
  const [savingTeam, setSavingTeam] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [ticketServices, setTicketServices] = useState<TicketService[]>([]);
  const [placesEpoch, setPlacesEpoch] = useState(0);

  const handleAuth = (responses: Response[]) => {
    if (responses.some((response) => response.status === 401)) {
      router.replace("/login");
      return false;
    }
    return true;
  };

  const loadDashboard = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        offset: "0",
        limit: "500",
        sort_by: "id",
        sort_dir: "asc",
      });
      const responses = await Promise.all([
        fetch("/api/management/place-stats", { cache: "no-store" }),
        fetch(`/api/management/places?${params}`, { cache: "no-store" }),
        fetch("/api/tickets/balance", { cache: "no-store" }),
        fetch("/api/tickets/ledger?limit=50&collapse_daily=true", { cache: "no-store" }),
        fetch("/api/notifications/me?limit=50&offset=0&unread_only=false", {
          cache: "no-store",
        }),
        fetch("/api/me", { cache: "no-store" }),
        fetch("/api/upstream/tickets/services", { cache: "no-store" }),
      ]);
      if (!handleAuth(responses)) return;
      if (!responses[0].ok || !responses[1].ok) {
        throw new Error("대시보드 정보를 불러오지 못했습니다.");
      }
      const [
        statsData,
        placesData,
        ticketData,
        ledgerData,
        notificationData,
        meData,
        servicesData,
      ] = await Promise.all(responses.map((response) => response.json().catch(() => ({}))));
      setStats(statsData as PlaceStatsResponse);
      setPlaces((placesData as PlacesResponse).items ?? []);
      setTickets(responses[2].ok ? (ticketData as TicketsBalanceResponse) : {});
      setLedger(responses[3].ok ? (ledgerData as TicketsLedgerResponse) : {});
      setNotifications(
        responses[4].ok ? (notificationData as NotificationsResponse) : {},
      );
      const user = (meData as { user?: SessionUser })?.user;
      setSessionUser(responses[5].ok && user?.username ? user : null);
      setTicketServices(
        responses[6].ok
          ? ((servicesData as { services?: TicketService[] }).services ?? [])
          : [],
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const loadTeam = async () => {
    const [childrenResponse, placesResponse] = await Promise.all([
      fetch("/api/team/children", { cache: "no-store" }),
      fetch("/api/team/places", { cache: "no-store" }),
    ]);
    if (childrenResponse.status === 403 || placesResponse.status === 403) {
      setTeamAvailable(false);
      return;
    }
    if (childrenResponse.ok && placesResponse.ok) {
      setChildren((await childrenResponse.json()) as ChildAccount[]);
      setAllowedPlaces(((await placesResponse.json()) as TeamPlacesResponse).meta ?? []);
      setTeamAvailable(true);
    } else {
      setTeamAvailable(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([loadDashboard(), loadTeam()]);
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectView = (next: View) => {
    setView(next);
    setMobileOpen(false);
  };

  const refresh = () => {
    startRefresh(() => {
      void loadDashboard(true);
      setPlacesEpoch((current) => current + 1);
    });
  };

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
  };

  const ticketTotal = useMemo(
    () =>
      Object.values(tickets.tickets ?? {}).reduce(
        (sum, value) => sum + Number(value || 0),
        0,
      ),
    [tickets],
  );

  const completionRate = useMemo(() => {
    const done = Number(stats.completed_workload ?? 0);
    const remaining = Number(stats.remaining_workload ?? 0);
    return done + remaining > 0 ? (done / (done + remaining)) * 100 : 0;
  }, [stats]);

  const markRead = async (id: number) => {
    setNotifications((current) => ({
      ...current,
      summary: {
        ...current.summary,
        unread_count: Math.max(0, Number(current.summary?.unread_count ?? 0) - 1),
      },
      items: current.items?.map((item) =>
        item.id === id ? { ...item, is_read: true } : item,
      ),
    }));
    const response = await fetch(`/api/notifications/${id}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!response.ok) void loadDashboard(true);
  };

  const markAllRead = async () => {
    const response = await fetch("/api/notifications/read-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unread_only: true }),
    });
    if (response.ok) {
      setNotifications((current) => ({
        ...current,
        summary: { ...current.summary, unread_count: 0 },
        items: current.items?.map((item) => ({ ...item, is_read: true })),
      }));
    }
  };

  const chooseChild = async (child: ChildAccount) => {
    setSelectedChild(child);
    const response = await fetch(
      `/api/team/places?username=${encodeURIComponent(child.username)}`,
      { cache: "no-store" },
    );
    if (response.ok) {
      const data = (await response.json()) as TeamPlacesResponse;
      setAssignedAliases(data.aliases ?? []);
    }
  };

  const toggleAssignment = (alias: string) => {
    setAssignedAliases((current) =>
      current.includes(alias)
        ? current.filter((item) => item !== alias)
        : [...current, alias],
    );
  };

  const saveAssignments = async () => {
    if (!selectedChild) return;
    setSavingTeam(true);
    const response = await fetch("/api/team/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: selectedChild.username,
        aliases: assignedAliases,
      }),
    });
    if (response.ok) {
      setChildren((current) =>
        current.map((child) =>
          child.id === selectedChild.id
            ? { ...child, assigned_count: assignedAliases.length }
            : child,
        ),
      );
    }
    setSavingTeam(false);
  };

  const visibleNav = NAV_ITEMS.filter(
    (item) => item.id !== "team" || teamAvailable === true,
  );

  return (
    <div className="dashboard-shell">
      <AnimatePresence>
        {mobileOpen ? (
          <motion.button
            className="mobile-scrim"
            aria-label="메뉴 닫기"
            onClick={() => setMobileOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        ) : null}
      </AnimatePresence>

      <aside className={`dashboard-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="brand">
          <Image src="/logo_1.png" alt="Elevate" width={178} height={48} priority />
          <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="메뉴 닫기">
            <Icon name="close" />
          </button>
        </div>

        <nav className="main-nav" aria-label="대시보드 메뉴">
          <p className="nav-caption">WORKSPACE</p>
          {visibleNav.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => selectView(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id === "notifications" &&
              Number(notifications.summary?.unread_count ?? 0) > 0 ? (
                <em>{notifications.summary?.unread_count}</em>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="sidebar-summary">
          <div className="mini-logo">
            <Image src="/logo_2.png" alt="" width={34} height={34} />
          </div>
          <div>
            <span>{sessionUser?.username || "이용권"}</span>
            <strong>{number(ticketTotal)}</strong>
          </div>
        </div>
        <button className="logout-button" onClick={() => void logout()}>
          <Icon name="logout" />
          로그아웃
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="메뉴 열기">
            <Icon name="menu" />
          </button>
          <div className="mobile-brand">
            <Image src="/logo_1.png" alt="Elevate" width={126} height={34} />
          </div>
          <div className="topbar-actions">
            <button className="refresh-button" onClick={refresh} disabled={refreshing}>
              <Icon name="refresh" size={17} />
              <span>{refreshing ? "새로고침 중" : "새로고침"}</span>
            </button>
            <button className="notification-button" onClick={() => selectView("notifications")} aria-label="알림 보기">
              <Icon name="bell" size={19} />
              {Number(notifications.summary?.unread_count ?? 0) > 0 ? <i /> : null}
            </button>
            {sessionUser?.username ? (
              <div className="avatar" title={sessionUser.username}>
                {sessionUser.username.slice(0, 1).toUpperCase()}
              </div>
            ) : null}
          </div>
        </header>

        <div className={`dashboard-content${view === "places" ? " is-wide" : ""}`}>
          {error ? (
            <div className="error-banner">
              <span>{error}</span>
              <button onClick={() => void loadDashboard()}>다시 시도</button>
            </div>
          ) : null}

          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {view === "overview" ? (
                <Overview
                  loading={loading}
                  stats={stats}
                  places={places}
                  ticketTotal={ticketTotal}
                  completionRate={completionRate}
                  notifications={notifications.items ?? []}
                  unread={Number(notifications.summary?.unread_count ?? 0)}
                  username={sessionUser?.username ?? ""}
                  role={sessionUser?.role ?? ""}
                  onNavigate={selectView}
                />
              ) : null}
              {view === "places" ? (
                <PlacesView
                  total={Number(stats.registered_places ?? places.length)}
                  reloadToken={placesEpoch}
                  onRefresh={() => {
                    void loadDashboard(true);
                    setPlacesEpoch((current) => current + 1);
                  }}
                />
              ) : null}
              {view === "tickets" ? (
                <TicketsView balance={tickets} ledger={ledger} services={ticketServices} />
              ) : null}
              {view === "notifications" ? (
                <NotificationsView
                  notifications={notifications}
                  onRead={markRead}
                  onReadAll={markAllRead}
                />
              ) : null}
              {view === "team" ? (
                <TeamView
                  accounts={children}
                  allowedPlaces={allowedPlaces}
                  selected={selectedChild}
                  assignedAliases={assignedAliases}
                  saving={savingTeam}
                  onSelect={chooseChild}
                  onToggle={toggleAssignment}
                  onSave={saveAssignments}
                />
              ) : null}
              {view === "settings" ? (
                <ScreenManage
                  onSaved={() => {
                    void loadDashboard(true);
                    setPlacesEpoch((current) => current + 1);
                  }}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function Overview({
  loading,
  stats,
  places,
  ticketTotal,
  completionRate,
  notifications,
  unread,
  username,
  role,
  onNavigate,
}: {
  loading: boolean;
  stats: PlaceStatsResponse;
  places: PlaceItem[];
  ticketTotal: number;
  completionRate: number;
  notifications: NotificationItem[];
  unread: number;
  username: string;
  role: string;
  onNavigate: (view: View) => void;
}) {
  const activePlaces = places
    .filter((place) => Number(place.remaining ?? 0) > 0)
    .sort((a, b) => Number(b.today ?? 0) - Number(a.today ?? 0))
    .slice(0, 5);

  return (
    <>
      <SectionHeader
        eyebrow="OVERVIEW"
        title={username || "홈"}
        description={`${roleLabel(role)}${role ? " · " : ""}등록 플레이스 ${number(stats.registered_places)}곳 · 남은 작업 ${number(stats.remaining_workload)}건`}
      />
      {loading ? (
        <LoadingPanel />
      ) : (
        <>
          <section className="hero-grid">
            <div className="hero-card">
              <div className="hero-copy">
                <span className="soft-badge"><Icon name="spark" size={15} /> 전체 진행률</span>
                <h2>완료 {number(stats.completed_workload)}건</h2>
                <p>남은 작업 {number(stats.remaining_workload)}건</p>
                <button onClick={() => onNavigate("places")}>
                  플레이스 확인 <Icon name="arrow" size={16} />
                </button>
              </div>
              <ProgressRing value={completionRate} label="완료" />
            </div>
            <button className="ticket-card" onClick={() => onNavigate("tickets")}>
              <div className="ticket-card-icon"><Icon name="ticket" /></div>
              <span>사용 가능 이용권</span>
              <strong>{number(ticketTotal)}</strong>
              <small>이용 내역 확인 <Icon name="arrow" size={14} /></small>
            </button>
          </section>

          <section className="metric-grid">
            {[
              ["운영 플레이스", stats.registered_places, "building", "blue"],
              ["오늘 요청량", stats.requested_workload, "arrow", "violet"],
              ["남은 작업", stats.remaining_workload, "pin", "pink"],
              ["완료 플레이스", stats.completed_places, "check", "green"],
            ].map(([label, value, icon, color]) => (
              <div className="metric-card" key={String(label)}>
                <div className={`metric-icon ${color}`}><Icon name={icon as IconName} /></div>
                <div><span>{label}</span><strong>{number(value as number)}</strong></div>
              </div>
            ))}
          </section>

          <section className="overview-columns">
            <div className="content-card">
              <div className="card-heading">
                <div><h2>진행 중인 플레이스</h2><p>오늘 작업량이 높은 순</p></div>
                <button onClick={() => onNavigate("places")}>전체 보기</button>
              </div>
              <div className="place-list">
                {activePlaces.length ? activePlaces.map((place) => {
                  const percent = Number(place.amount)
                    ? Math.min(100, (Number(place.done) / Number(place.amount)) * 100)
                    : 0;
                  return (
                    <div className="place-row" key={place.pid}>
                      <div className="place-avatar"><Icon name="pin" size={17} /></div>
                      <div className="place-main">
                        <div><strong>{place.name || place.alias || "—"}</strong></div>
                        <div className="bar"><i style={{ width: `${percent}%` }} /></div>
                      </div>
                      <div className="place-numbers"><strong>{number(place.today)}</strong><span>/ {number(place.today_target)} 오늘</span></div>
                    </div>
                  );
                }) : <div className="compact-empty">진행 중인 플레이스가 없습니다.</div>}
              </div>
            </div>
            <div className="content-card">
              <div className="card-heading">
                <div><h2>최근 알림</h2><p>읽지 않은 알림 {number(unread)}개</p></div>
                <button onClick={() => onNavigate("notifications")}>전체 보기</button>
              </div>
              <div className="notification-preview">
                {notifications.slice(0, 4).map((item) => {
                  const copy = notificationCopy(item);
                  return (
                    <button key={item.id} onClick={() => onNavigate("notifications")}>
                      <span className={item.is_read ? "" : "unread"}><Icon name="bell" size={16} /></span>
                      <div><strong>{copy.title}</strong><p>{copy.body}</p><small>{dateTime(item.last_occurred_at ?? item.created_at)}</small></div>
                    </button>
                  );
                })}
                {!notifications.length ? <div className="compact-empty">받은 알림이 없습니다.</div> : null}
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}

function PlacesView({
  total,
  reloadToken,
  onRefresh,
}: {
  total: number;
  reloadToken: number;
  onRefresh: () => Promise<void> | void;
}) {
  return (
    <>
      <SectionHeader
        eyebrow="MY PLACES"
        title="플레이스"
        description={`내게 배정된 플레이스 ${number(total)}곳`}
      />
      <PlaceWorkspace reloadToken={reloadToken} onRefresh={onRefresh} />
    </>
  );
}

function TicketsView({
  balance,
  ledger,
  services,
}: {
  balance: TicketsBalanceResponse;
  ledger: TicketsLedgerResponse;
  services: TicketService[];
}) {
  const nameByCode = new Map(services.map((service) => [service.service_code, service.service_name]));
  const entries = Object.entries(balance.tickets ?? {});
  const total = entries.reduce((sum, [, value]) => sum + Number(value || 0), 0);
  return (
    <>
      <SectionHeader eyebrow="TICKETS" title="이용권" description={`전체 ${number(total)}`} />
      <section className="ticket-balance-grid">
        <div className="total-balance-card"><span>전체 이용권</span><strong>{number(total)}</strong></div>
        {entries.map(([code, amount], index) => (
          <div className="service-balance-card" key={code}>
            <div className={`service-mark tone-${index % 3}`}><Icon name="ticket" size={18} /></div>
            <div><span>{nameByCode.get(code) || code}</span><strong>{number(amount)}</strong></div>
          </div>
        ))}
      </section>
      <section className="content-card ledger-card">
        <div className="card-heading"><div><h2>최근 이용 내역</h2></div></div>
        <div className="ledger-list">
          {(ledger.transactions ?? []).map((transaction) => {
            const positive = Number(transaction.amount) > 0;
            const serviceName = nameByCode.get(transaction.service_code) || transaction.service_code;
            return (
              <div key={transaction.id}>
                <span className={`ledger-icon ${positive ? "plus" : "minus"}`}><Icon name={positive ? "check" : "ticket"} size={17} /></span>
                <div className="ledger-copy"><strong>{transaction.description || serviceName}</strong><span>{serviceName} · {dateTime(transaction.created_at)}</span></div>
                <div className="ledger-amount"><strong className={positive ? "positive" : ""}>{positive ? "+" : ""}{number(transaction.amount)}</strong><span>잔액 {number(transaction.balance_after)}</span></div>
              </div>
            );
          })}
          {!(ledger.transactions ?? []).length ? <div className="compact-empty">이용 내역이 없습니다.</div> : null}
        </div>
      </section>
    </>
  );
}

function NotificationsView({
  notifications,
  onRead,
  onReadAll,
}: {
  notifications: NotificationsResponse;
  onRead: (id: number) => Promise<void>;
  onReadAll: () => Promise<void>;
}) {
  return (
    <>
      <SectionHeader
        eyebrow="NOTIFICATIONS"
        title="알림"
        description={`읽지 않은 알림 ${number(notifications.summary?.unread_count)}개`}
        action={<button className="primary-outline-button" onClick={() => void onReadAll()} disabled={!notifications.summary?.unread_count}><Icon name="check" size={16} /> 모두 읽음</button>}
      />
      <section className="notification-list-card">
        {(notifications.items ?? []).map((item) => {
          const copy = notificationCopy(item);
          return (
            <button key={item.id} className={item.is_read ? "is-read" : ""} onClick={() => !item.is_read && void onRead(item.id)}>
              <span className="notification-list-icon"><Icon name="bell" size={19} /></span>
              <div><div className="notification-title"><strong>{copy.title}</strong>{!item.is_read ? <i>안읽음</i> : null}</div><p>{copy.body}</p><small>{item.place_name || item.place_alias ? `${item.place_name ?? item.place_alias} · ` : ""}{dateTime(item.last_occurred_at ?? item.created_at)}</small></div>
              <Icon name="arrow" size={17} />
            </button>
          );
        })}
        {!(notifications.items ?? []).length ? <div className="empty-panel"><Icon name="bell" size={28} /><p>받은 알림이 없습니다.</p></div> : null}
      </section>
    </>
  );
}

function TeamView({
  accounts,
  allowedPlaces,
  selected,
  assignedAliases,
  saving,
  onSelect,
  onToggle,
  onSave,
}: {
  accounts: ChildAccount[];
  allowedPlaces: TeamPlace[];
  selected: ChildAccount | null;
  assignedAliases: string[];
  saving: boolean;
  onSelect: (child: ChildAccount) => Promise<void>;
  onToggle: (alias: string) => void;
  onSave: () => Promise<void>;
}) {
  return (
    <>
      <SectionHeader eyebrow="TEAM" title="하위 계정" description={`직속 하위 계정 ${number(accounts.length)}개`} />
      <div className="team-layout">
        <section className="content-card child-list-card">
          <div className="card-heading"><div><h2>계정 목록</h2><p>직속 하위 계정 {number(accounts.length)}개</p></div></div>
          <div className="child-list">
            {accounts.map((child) => (
              <button key={child.id} className={selected?.id === child.id ? "active" : ""} onClick={() => void onSelect(child)}>
                <span className="child-avatar">{child.username.slice(0, 1).toUpperCase()}</span>
                <div><strong>{child.username}</strong><span>플레이스 {number(child.assigned_count)}곳</span></div>
                <em className={child.status === "active" ? "online" : ""}>{child.status === "active" ? "활성" : "비활성"}</em>
                <Icon name="arrow" size={16} />
              </button>
            ))}
            {!accounts.length ? <div className="compact-empty">등록된 하위 계정이 없습니다.</div> : null}
          </div>
        </section>
        <section className="content-card assignment-card">
          {selected ? (
            <>
              <div className="card-heading">
                <div><h2>{selected.username} 플레이스 배정</h2><p>{number(assignedAliases.length)}곳 선택됨</p></div>
                <button className="solid-button" onClick={() => void onSave()} disabled={saving}>{saving ? "저장 중" : "배정 저장"}</button>
              </div>
              <div className="assignment-search-note">내게 배정된 플레이스 안에서 선택할 수 있습니다.</div>
              <div className="assignment-grid">
                {allowedPlaces.map((place) => {
                  const checked = assignedAliases.includes(place.alias);
                  return (
                    <button key={place.alias} className={checked ? "selected" : ""} onClick={() => onToggle(place.alias)}>
                      <span className="fake-check">{checked ? <Icon name="check" size={14} /> : null}</span>
                      <div><strong>{place.placename || place.alias}</strong>{place.mid ? <span>{place.mid}</span> : null}</div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : <div className="empty-panel"><Icon name="users" size={30} /><p>플레이스를 배정할 계정을 선택하세요.</p></div>}
        </section>
      </div>
    </>
  );
}
