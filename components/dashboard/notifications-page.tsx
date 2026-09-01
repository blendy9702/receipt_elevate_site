"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { EmptyPanel, ErrorBanner, LoadingPanel, SectionHeader } from "@/components/dashboard/ui";
import { useDashboardChrome } from "@/components/dashboard/chrome";
import { dateTime, goLoginIfUnauthorized, number } from "@/lib/format";
import { notificationCopy } from "@/lib/notification-copy";
import type { NotificationsResponse } from "@/lib/types";

export function NotificationsPage() {
  const { refreshEpoch, reloadChrome } = useDashboardChrome();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationsResponse>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "/api/notifications/me?limit=50&offset=0&unread_only=false",
        { cache: "no-store" },
      );
      if (goLoginIfUnauthorized(response)) return;
      if (!response.ok) throw new Error("알림을 불러오지 못했습니다.");
      setNotifications((await response.json()) as NotificationsResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "알림을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshEpoch]);

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
    if (!response.ok) {
      void load();
      return;
    }
    void reloadChrome();
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
      void reloadChrome();
    }
  };

  return (
    <>
      <SectionHeader
        eyebrow="NOTIFICATIONS"
        title="알림"
        description={`읽지 않은 알림 ${number(notifications.summary?.unread_count)}개`}
        action={
          <button
            className="primary-outline-button"
            onClick={() => void markAllRead()}
            disabled={!notifications.summary?.unread_count}
          >
            <Icon name="check" size={16} /> 모두 읽음
          </button>
        }
      />
      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
      {loading ? (
        <LoadingPanel />
      ) : (
        <section className="notification-list-card">
          {(notifications.items ?? []).map((item) => {
            const copy = notificationCopy(item);
            return (
              <button
                key={item.id}
                className={item.is_read ? "is-read" : ""}
                onClick={() => !item.is_read && void markRead(item.id)}
              >
                <span className="notification-list-icon"><Icon name="bell" size={19} /></span>
                <div>
                  <div className="notification-title">
                    <strong>{copy.title}</strong>
                    {!item.is_read ? <i>안읽음</i> : null}
                  </div>
                  <p>{copy.body}</p>
                  <small>
                    {item.place_name || item.place_alias ? `${item.place_name ?? item.place_alias} · ` : ""}
                    {dateTime(item.last_occurred_at ?? item.created_at)}
                  </small>
                </div>
                <Icon name="arrow" size={17} />
              </button>
            );
          })}
          {!(notifications.items ?? []).length ? (
            <EmptyPanel icon="bell" message="받은 알림이 없습니다." />
          ) : null}
        </section>
      )}
    </>
  );
}
