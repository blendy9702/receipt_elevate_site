"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { EmptyPanel, ErrorBanner, LoadingPanel, SectionHeader } from "@/components/dashboard/ui";
import { useDashboardChrome } from "@/components/dashboard/chrome";
import { goLoginIfUnauthorized, number } from "@/lib/format";
import type { ChildAccount, TeamPlace, TeamPlacesResponse } from "@/lib/types";

export function TeamPage() {
  const { teamAvailable, children, refreshEpoch, reloadChrome } = useDashboardChrome();
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ChildAccount[]>([]);
  const [allowedPlaces, setAllowedPlaces] = useState<TeamPlace[]>([]);
  const [selected, setSelected] = useState<ChildAccount | null>(null);
  const [assignedAliases, setAssignedAliases] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const loadPlaces = async () => {
    setError(null);
    const response = await fetch("/api/team/places", { cache: "no-store" });
    if (goLoginIfUnauthorized(response)) return;
    if (response.status === 403) return;
    if (!response.ok) {
      setError("하위 계정 정보를 불러오지 못했습니다.");
      return;
    }
    const data = (await response.json()) as TeamPlacesResponse;
    setAllowedPlaces(data.meta ?? []);
  };

  useEffect(() => {
    setAccounts(children);
  }, [children]);

  useEffect(() => {
    if (teamAvailable === true) void loadPlaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshEpoch, teamAvailable]);

  const chooseChild = async (child: ChildAccount) => {
    setSelected(child);
    const response = await fetch(
      `/api/team/places?username=${encodeURIComponent(child.username)}`,
      { cache: "no-store" },
    );
    if (goLoginIfUnauthorized(response)) return;
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
    if (!selected) return;
    setSaving(true);
    const response = await fetch("/api/team/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: selected.username,
        aliases: assignedAliases,
      }),
    });
    if (response.ok) {
      setAccounts((current) =>
        current.map((child) =>
          child.id === selected.id
            ? { ...child, assigned_count: assignedAliases.length }
            : child,
        ),
      );
      void reloadChrome();
    }
    setSaving(false);
  };

  if (teamAvailable === null) {
    return (
      <>
        <SectionHeader eyebrow="TEAM" title="하위 계정" description="하위 계정 정보를 확인하고 있습니다." />
        <LoadingPanel />
      </>
    );
  }

  if (teamAvailable === false) {
    return (
      <>
        <SectionHeader eyebrow="TEAM" title="하위 계정" description="이 계정에서는 하위 계정을 관리할 수 없습니다." />
        <EmptyPanel icon="users" message="하위 계정 관리 권한이 없습니다." />
      </>
    );
  }

  return (
    <>
      <SectionHeader
        eyebrow="TEAM"
        title="하위 계정"
        description={`직속 하위 계정 ${number(accounts.length)}개`}
      />
      {error ? <ErrorBanner message={error} onRetry={() => void loadPlaces()} /> : null}
      <div className="team-layout">
        <section className="content-card child-list-card">
          <div className="card-heading">
            <div>
              <h2>계정 목록</h2>
              <p>직속 하위 계정 {number(accounts.length)}개</p>
            </div>
          </div>
          <div className="child-list">
            {accounts.map((child) => (
              <button
                key={child.id}
                className={selected?.id === child.id ? "active" : ""}
                onClick={() => void chooseChild(child)}
              >
                <span className="child-avatar">{child.username.slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong>{child.username}</strong>
                  <span>플레이스 {number(child.assigned_count)}곳</span>
                </div>
                <em className={child.status === "active" ? "online" : ""}>
                  {child.status === "active" ? "활성" : "비활성"}
                </em>
                <Icon name="arrow" size={16} />
              </button>
            ))}
            {!accounts.length ? (
              <div className="compact-empty">등록된 하위 계정이 없습니다.</div>
            ) : null}
          </div>
        </section>
        <section className="content-card assignment-card">
          {selected ? (
            <>
              <div className="card-heading">
                <div>
                  <h2>{selected.username} 플레이스 배정</h2>
                  <p>{number(assignedAliases.length)}곳 선택됨</p>
                </div>
                <button className="solid-button" onClick={() => void saveAssignments()} disabled={saving}>
                  {saving ? "저장 중" : "배정 저장"}
                </button>
              </div>
              <div className="assignment-search-note">내게 배정된 플레이스 안에서 선택할 수 있습니다.</div>
              <div className="assignment-grid">
                {allowedPlaces.map((place) => {
                  const checked = assignedAliases.includes(place.alias);
                  return (
                    <button
                      key={place.alias}
                      className={checked ? "selected" : ""}
                      onClick={() => toggleAssignment(place.alias)}
                    >
                      <span className="fake-check">{checked ? <Icon name="check" size={14} /> : null}</span>
                      <div>
                        <strong>{place.placename || place.alias}</strong>
                        {place.mid ? <span>{place.mid}</span> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyPanel icon="users" message="플레이스를 배정할 계정을 선택하세요." />
          )}
        </section>
      </div>
    </>
  );
}
