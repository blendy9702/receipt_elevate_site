"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CountUp } from "@/components/count-up";
import { Icon, type IconName } from "@/components/icon";
import { ErrorBanner, LoadingPanel, ProgressRing, SectionHeader } from "@/components/dashboard/ui";
import { useDashboardChrome } from "@/components/dashboard/chrome";
import { dateTime, goLoginIfUnauthorized, roleLabel } from "@/lib/format";
import { notificationCopy } from "@/lib/notification-copy";
import type {
  NotificationItem,
  NotificationsResponse,
  PlaceItem,
  PlacesResponse,
  PlaceStatsResponse,
  TicketsBalanceResponse,
} from "@/lib/types";

export function OverviewPage() {
  const { sessionUser, refreshEpoch } = useDashboardChrome();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<PlaceStatsResponse>({});
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [ticketTotal, setTicketTotal] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    setLoading(true);
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
        fetch("/api/notifications/me?limit=50&offset=0&unread_only=false", {
          cache: "no-store",
        }),
      ]);
      if (goLoginIfUnauthorized(responses)) return;
      if (!responses[0].ok || !responses[1].ok) {
        throw new Error("대시보드 정보를 불러오지 못했습니다.");
      }
      const [statsData, placesData, ticketData, notificationData] = await Promise.all(
        responses.map((response) => response.json().catch(() => ({}))),
      );
      setStats(statsData as PlaceStatsResponse);
      setPlaces((placesData as PlacesResponse).items ?? []);
      const tickets = responses[2].ok
        ? ((ticketData as TicketsBalanceResponse).tickets ?? {})
        : {};
      setTicketTotal(
        Object.values(tickets).reduce((sum, value) => sum + Number(value || 0), 0),
      );
      const notice = responses[3].ok
        ? (notificationData as NotificationsResponse)
        : {};
      setNotifications(notice.items ?? []);
      setUnread(Number(notice.summary?.unread_count ?? 0));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshEpoch]);

  const completionRate = useMemo(() => {
    const done = Number(stats.completed_workload ?? 0);
    const remaining = Number(stats.remaining_workload ?? 0);
    return done + remaining > 0 ? (done / (done + remaining)) * 100 : 0;
  }, [stats]);

  const activePlaces = places
    .filter((place) => Number(place.remaining ?? 0) > 0)
    .sort((a, b) => Number(b.today ?? 0) - Number(a.today ?? 0))
    .slice(0, 5);

  return (
    <>
      <SectionHeader
        eyebrow="OVERVIEW"
        title={sessionUser?.username || "홈"}
        description={
          <>
            {roleLabel(sessionUser?.role)}
            {sessionUser?.role ? " · " : ""}
            등록 플레이스 <CountUp value={Number(stats.registered_places)} />곳 · 남은 작업{" "}
            <CountUp value={Number(stats.remaining_workload)} />건
          </>
        }
      />
      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
      {loading ? (
        <LoadingPanel />
      ) : (
        <>
          <section className="hero-grid">
            <div className="hero-card">
              <div className="hero-copy">
                <span className="soft-badge"><Icon name="spark" size={15} /> 전체 진행률</span>
                <h2>완료 <CountUp value={Number(stats.completed_workload)} />건</h2>
                <p>남은 작업 <CountUp value={Number(stats.remaining_workload)} />건</p>
                <Link href="/places">
                  플레이스 확인 <Icon name="arrow" size={16} />
                </Link>
              </div>
              <ProgressRing value={completionRate} label="완료" />
            </div>
            <Link className="ticket-card" href="/tickets">
              <div className="ticket-card-icon"><Icon name="ticket" /></div>
              <span>사용 가능 이용권</span>
              <strong><CountUp value={ticketTotal} /></strong>
              <small>이용 내역 확인 <Icon name="arrow" size={14} /></small>
            </Link>
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
                <div><span>{label}</span><strong><CountUp value={Number(value)} /></strong></div>
              </div>
            ))}
          </section>

          <section className="overview-columns">
            <div className="content-card">
              <div className="card-heading">
                <div><h2>진행 중인 플레이스</h2><p>오늘 작업량이 높은 순</p></div>
                <Link href="/places">전체 보기</Link>
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
                      <div className="place-numbers">
                        <strong><CountUp value={Number(place.today)} /></strong>
                        <span>/ <CountUp value={Number(place.today_target)} /> 오늘</span>
                      </div>
                    </div>
                  );
                }) : <div className="compact-empty">진행 중인 플레이스가 없습니다.</div>}
              </div>
            </div>
            <div className="content-card">
              <div className="card-heading">
                <div><h2>최근 알림</h2><p>읽지 않은 알림 <CountUp value={unread} />개</p></div>
                <Link href="/notifications">전체 보기</Link>
              </div>
              <div className="notification-preview">
                {notifications.slice(0, 4).map((item) => {
                  const copy = notificationCopy(item);
                  return (
                    <Link key={item.id} href="/notifications">
                      <span className={item.is_read ? "" : "unread"}><Icon name="bell" size={16} /></span>
                      <div><strong>{copy.title}</strong><p>{copy.body}</p><small>{dateTime(item.last_occurred_at ?? item.created_at)}</small></div>
                    </Link>
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
