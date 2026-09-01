"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon, type IconName } from "@/components/icon";
import { goLoginIfUnauthorized, number } from "@/lib/format";
import type {
  ChildAccount,
  NotificationsResponse,
  SessionUser,
  TicketsBalanceResponse,
} from "@/lib/types";

type DashboardChrome = {
  sessionUser: SessionUser | null;
  ticketTotal: number;
  unreadCount: number;
  teamAvailable: boolean | null;
  children: ChildAccount[];
  refreshEpoch: number;
  refreshing: boolean;
  refresh: () => void;
  reloadChrome: () => Promise<void>;
};

const ChromeContext = createContext<DashboardChrome | null>(null);

export function useDashboardChrome() {
  const value = useContext(ChromeContext);
  if (!value) {
    throw new Error("useDashboardChrome must be used inside DashboardLayout");
  }
  return value;
}

const NAV_ITEMS: Array<{
  href: string;
  id: string;
  label: string;
  icon: IconName;
  teamOnly?: boolean;
}> = [
  { href: "/", id: "overview", label: "홈", icon: "home" },
  { href: "/places", id: "places", label: "플레이스", icon: "pin" },
  { href: "/tickets", id: "tickets", label: "이용권", icon: "ticket" },
  { href: "/notifications", id: "notifications", label: "알림", icon: "bell" },
  { href: "/team", id: "team", label: "하위 계정", icon: "users", teamOnly: true },
  { href: "/settings", id: "settings", label: "화면 관리", icon: "eye" },
];

function navActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [ticketTotal, setTicketTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [teamAvailable, setTeamAvailable] = useState<boolean | null>(null);
  const [childAccounts, setChildAccounts] = useState<ChildAccount[]>([]);
  const [refreshEpoch, setRefreshEpoch] = useState(0);

  const reloadChrome = useCallback(async () => {
    const responses = await Promise.all([
      fetch("/api/me", { cache: "no-store" }),
      fetch("/api/tickets/balance", { cache: "no-store" }),
      fetch("/api/notifications/me?limit=1&offset=0&unread_only=false", {
        cache: "no-store",
      }),
      fetch("/api/team/children", { cache: "no-store" }),
    ]);
    if (goLoginIfUnauthorized(responses)) return;

    const [meData, ticketData, notificationData, childrenData] = await Promise.all(
      responses.map((response) => response.json().catch(() => ({}))),
    );

    const user = (meData as { user?: SessionUser })?.user;
    setSessionUser(responses[0].ok && user?.username ? user : null);

    const tickets = responses[1].ok
      ? ((ticketData as TicketsBalanceResponse).tickets ?? {})
      : {};
    setTicketTotal(
      Object.values(tickets).reduce((sum, value) => sum + Number(value || 0), 0),
    );

    const notifications = responses[2].ok
      ? (notificationData as NotificationsResponse)
      : {};
    setUnreadCount(Number(notifications.summary?.unread_count ?? 0));

    if (responses[3].status === 403) {
      setTeamAvailable(false);
      setChildAccounts([]);
    } else if (responses[3].ok) {
      setTeamAvailable(true);
      setChildAccounts(childrenData as ChildAccount[]);
    } else {
      setTeamAvailable(false);
      setChildAccounts([]);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reloadChrome();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reloadChrome]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const refresh = useCallback(() => {
    startRefresh(() => {
      void reloadChrome();
      setRefreshEpoch((current) => current + 1);
    });
  }, [reloadChrome]);

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
  };

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.teamOnly || teamAvailable === true,
  );

  const value = useMemo<DashboardChrome>(
    () => ({
      sessionUser,
      ticketTotal,
      unreadCount,
      teamAvailable,
      children: childAccounts,
      refreshEpoch,
      refreshing,
      refresh,
      reloadChrome,
    }),
    [
      childAccounts,
      refreshEpoch,
      refreshing,
      refresh,
      reloadChrome,
      sessionUser,
      teamAvailable,
      ticketTotal,
      unreadCount,
    ],
  );

  return (
    <ChromeContext.Provider value={value}>
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
            <Link href="/" aria-label="홈">
              <Image src="/logo_1.png" alt="Elevate" width={178} height={48} priority />
            </Link>
            <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="메뉴 닫기">
              <Icon name="close" />
            </button>
          </div>

          <nav className="main-nav" aria-label="대시보드 메뉴">
            <p className="nav-caption">WORKSPACE</p>
            {visibleNav.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`nav-link${navActive(pathname, item.href) ? " active" : ""}`}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.id === "notifications" && unreadCount > 0 ? (
                  <em>{unreadCount}</em>
                ) : null}
              </Link>
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
              <Link className="notification-button" href="/notifications" aria-label="알림 보기">
                <Icon name="bell" size={19} />
                {unreadCount > 0 ? <i /> : null}
              </Link>
              {sessionUser?.username ? (
                <div className="avatar" title={sessionUser.username}>
                  {sessionUser.username.slice(0, 1).toUpperCase()}
                </div>
              ) : null}
            </div>
          </header>

          <div className={`dashboard-content${pathname.startsWith("/places") ? " is-wide" : ""}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </ChromeContext.Provider>
  );
}
