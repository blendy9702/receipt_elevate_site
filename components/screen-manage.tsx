"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ScreenPlace = {
  id: number;
  alias: string;
  placename?: string | null;
  mid?: string | null;
};

type InitResponse = {
  user_hidden?: string[];
  admin_hidden?: string[];
};

type PagedResponse = {
  items?: ScreenPlace[];
  has_more?: boolean;
  next_offset?: number | null;
};

type SaveResponse = {
  success?: boolean;
  mode?: string;
  inserted?: number;
  skipped?: number;
  invalid?: string[];
  detail?: string;
  error?: string;
};

export function ScreenManage({ onSaved }: { onSaved?: () => void | Promise<void> }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [bulk, setBulk] = useState("");
  const [places, setPlaces] = useState<ScreenPlace[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hiddenRef = useRef(hidden);
  const placesRef = useRef(places);
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(false);
  const queryRef = useRef("");
  hiddenRef.current = hidden;
  placesRef.current = places;
  offsetRef.current = nextOffset;
  hasMoreRef.current = hasMore;
  queryRef.current = debouncedQuery;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadInit = useCallback(async () => {
    const res = await fetch("/api/preferences/hidden-places", { cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as InitResponse;
    if (res.ok) setHidden(new Set(data.user_hidden ?? []));
  }, []);

  const fetchPage = useCallback(async ({
    offset,
    append,
  }: {
    offset: number;
    append: boolean;
  }) => {
    if (append && loadingMoreRef.current) return;
    if (!append) abortRef.current?.abort();
    const aborter = new AbortController();
    abortRef.current = aborter;
    loadingMoreRef.current = true;
    if (!append) {
      setLoading(true);
      setPlaces([]);
      setHasMore(false);
      setNextOffset(0);
    }
    const requestedQuery = queryRef.current;
    try {
      const params = new URLSearchParams({
        offset: String(offset),
        limit: "500",
        q: requestedQuery,
      });
      const res = await fetch(`/api/upstream/places/paged?${params}`, {
        cache: "no-store",
        signal: aborter.signal,
      });
      const data = (await res.json().catch(() => ({}))) as PagedResponse;
      if (queryRef.current !== requestedQuery) return;
      if (!res.ok) throw new Error("플레이스 목록을 불러오지 못했습니다.");
      const rows = data.items ?? [];
      setPlaces((current) => (append ? [...current, ...rows] : rows));
      setHasMore(Boolean(data.has_more));
      setNextOffset(data.next_offset ?? offset + rows.length);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (!append && queryRef.current === requestedQuery) setPlaces([]);
    } finally {
      if (!aborter.signal.aborted && queryRef.current === requestedQuery) {
        loadingMoreRef.current = false;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadInit();
  }, [loadInit]);

  useEffect(() => {
    void fetchPage({ offset: 0, append: false });
    return () => abortRef.current?.abort();
  }, [debouncedQuery, fetchPage]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting || !hasMoreRef.current || loadingMoreRef.current || loading) return;
      void fetchPage({ offset: offsetRef.current, append: true });
    }, { rootMargin: "300px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchPage, loading, places.length]);

  const toggleCard = (alias: string) => {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(alias)) next.delete(alias);
      else next.add(alias);
      return next;
    });
  };

  const selectAll = async () => {
    setSelectingAll(true);
    try {
      let offset = offsetRef.current;
      let more = hasMoreRef.current;
      let all = [...placesRef.current];
      loadingMoreRef.current = true;
      const requestedQuery = queryRef.current;
      while (more) {
        const params = new URLSearchParams({
          offset: String(offset),
          limit: "500",
          q: requestedQuery,
        });
        const res = await fetch(`/api/upstream/places/paged?${params}`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as PagedResponse;
        const rows = data.items ?? [];
        all = all.concat(rows);
        more = Boolean(data.has_more);
        offset = data.next_offset ?? offset + rows.length;
      }
      setPlaces(all);
      setHasMore(false);
      setNextOffset(offset);
      setHidden((current) => {
        const next = new Set(current);
        all.forEach((place) => next.add(place.alias));
        return next;
      });
    } finally {
      loadingMoreRef.current = false;
      setSelectingAll(false);
    }
  };

  const save = async (mode: "replace" | "append") => {
    setSaving(true);
    setNotice(null);
    const aliases = new Set(hiddenRef.current);
    bulk.split(",").map((item) => item.trim()).filter(Boolean).forEach((alias) => aliases.add(alias));
    setHidden(aliases);
    try {
      const res = await fetch("/api/preferences/hidden-places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aliases: [...aliases], mode }),
      });
      const data = (await res.json().catch(() => ({}))) as SaveResponse;
      if (!res.ok || data.success === false) {
        setNotice(data.detail || data.error || "저장 실패");
        return;
      }
      const invalidCount = (data.invalid ?? []).length;
      setNotice(
        `저장 완료 (mode=${mode}) · 추가 ${data.inserted ?? 0} · 무시 ${data.skipped ?? 0} · 배정 외 ${invalidCount}`,
      );
      await loadInit();
      await onSaved?.();
    } catch {
      setNotice("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || selectingAll;

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">SCREEN</p>
          <h1>화면 관리</h1>
          <p className="section-description">내 숨김(배정된 플레이스만)</p>
        </div>
      </div>

      <div className="screen-manage">
        <section className="content-card screen-manage-pane">
          <div className="screen-manage-actions">
            <button type="button" className="primary-outline-button" disabled={busy || loading} onClick={() => void selectAll()}>
              {selectingAll ? "선택 중" : "전체선택"}
            </button>
            <button type="button" className="primary-outline-button" disabled={busy} onClick={() => setHidden(new Set())}>
              전체해제
            </button>
          </div>
          <label className="modal-field">
            검색 (이름/별칭)
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="검색어 입력" />
          </label>
          <label className="modal-field">
            대량 제외 (alias를 ,로 구분)
            <input value={bulk} onChange={(event) => setBulk(event.target.value)} placeholder="예: aliasA, aliasB" />
          </label>
          <p className="field-hint">카드 선택 + 입력값을 합쳐 중복 제거하여 저장합니다.</p>
          <div className="screen-manage-save">
            <button type="button" className="solid-button" disabled={busy} onClick={() => void save("replace")}>
              {saving ? "저장 중" : "저장(교체)"}
            </button>
            <button type="button" className="solid-button" disabled={busy} onClick={() => void save("append")}>
              {saving ? "저장 중" : "저장(추가)"}
            </button>
          </div>
          {notice ? <div className="modal-notice">{notice}</div> : null}
        </section>

        <section className="content-card screen-manage-pane">
          <div className="screen-manage-cards">
            {loading && !places.length ? (
              <div className="compact-empty">불러오는 중…</div>
            ) : null}
            {!loading && !places.length ? (
              <div className="compact-empty">결과가 없습니다.</div>
            ) : null}
            <div className="screen-card-grid">
              {places.map((place) => {
                const selected = hidden.has(place.alias);
                return (
                  <button
                    key={`${place.id}-${place.alias}`}
                    type="button"
                    className={`screen-place-card ${selected ? "selected" : ""}`}
                    onClick={() => toggleCard(place.alias)}
                    title={`${place.placename || ""} ${place.alias}`}
                  >
                    <strong>{place.placename || "—"}</strong>
                    <span>{place.alias}</span>
                  </button>
                );
              })}
            </div>
            <div ref={sentinelRef} className="list-sentinel" />
          </div>
        </section>
      </div>
    </>
  );
}
