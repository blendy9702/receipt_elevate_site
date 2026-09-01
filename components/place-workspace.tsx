"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type {
  AssignedReceipt,
  AssignedScript,
  AutoPoolImage,
  GoodthingUi,
  PlaceImage,
  PlaceItem,
  PlacesResponse,
  ReviewJobItem,
  VisitInfo,
} from "@/lib/types";
import {
  apiJson,
  errorMessage,
  formatReceiptDateLabel,
  formatReceiptDateTime,
  mediaSrc,
  number,
  reviewStatusLabel,
  reviewStatusTone,
  truncate,
} from "@/lib/place-helpers";
import {
  loadMainInfiniteLimit,
  loadMainListSettings,
  loadMainPageSize,
  normalizeInfiniteLimit,
  PAGE_SIZE_CHOICES,
  saveMainInfiniteLimit,
  saveMainListSettings,
  saveMainPageSize,
  type MainListSettings,
  type PageSizeValue,
  type SortDir,
} from "@/lib/main-list-settings";

type MenuAction =
  | "reviews"
  | "dailycap"
  | "issue"
  | "hide"
  | "scripts"
  | "goodthing"
  | "purge"
  | "generate"
  | "uploadScripts"
  | "uploadAutoImages"
  | "purgeScripts"
  | "overwrite"
  | "photos"
  | "manual"
  | "download";

type StatusFilter = "all" | "active" | "done";

const FILTERS: Array<[StatusFilter, string]> = [
  ["all", "전체"],
  ["active", "진행 중"],
  ["done", "완료"],
];

function placeRowClass(place: PlaceItem) {
  if (Number(place.status ?? 1) === 0) return "is-paused";
  if (Number(place.remaining ?? 0) <= 0) return "is-complete";
  if (Number(place.today ?? 0) >= Number(place.requested ?? 0) && Number(place.requested ?? 0) > 0) {
    return "is-today-done";
  }
  return "";
}

function formatStartDate(value?: string | null) {
  if (!value) return "—";
  const matched = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matched) return `${matched[1].slice(2)}.${matched[2]}.${matched[3]}`;
  return "—";
}

function reviewUrl(item: ReviewJobItem) {
  if (!item.user_code || item.review_id == null) return "";
  return `https://m.place.naver.com/my/${item.user_code}/reviewfeed?reviewId=${item.review_id}`;
}

function sortByRdate<T extends { rdate?: string | null }>(rows: T[], dir: "asc" | "desc") {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const dateA = formatReceiptDateTime(a.rdate);
    const dateB = formatReceiptDateTime(b.rdate);
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.localeCompare(dateB) * mul;
  });
}

function csvSet(value?: string | string[] | null, fallback?: string[]) {
  if (Array.isArray(value)) return new Set(value.map((item) => String(item).trim()).filter(Boolean));
  if (value === "random" || value == null || value === "None") return new Set(fallback ?? []);
  return new Set(String(value).split(",").map((item) => item.trim()).filter(Boolean));
}

export function PlaceWorkspace({
  onRefresh,
  reloadToken = 0,
}: {
  onRefresh: () => Promise<void> | void;
  reloadToken?: number;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [pagedOffset, setPagedOffset] = useState(0);
  const [pageSize, setPageSize] = useState<PageSizeValue>("20");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showBillingOwner, setShowBillingOwner] = useState(false);
  const [infiniteLimit, setInfiniteLimit] = useState(500);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftSortDir, setDraftSortDir] = useState<SortDir>("asc");
  const [draftBilling, setDraftBilling] = useState(false);
  const [draftInfinite, setDraftInfinite] = useState(500);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [modal, setModal] = useState<MenuAction | null>(null);
  const [active, setActive] = useState<PlaceItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dailycap, setDailycap] = useState("");
  const [reviews, setReviews] = useState<ReviewJobItem[]>([]);
  const [scripts, setScripts] = useState<AssignedScript[]>([]);
  const [scriptSort, setScriptSort] = useState<"asc" | "desc">("asc");
  const [editingScript, setEditingScript] = useState<{ id: number; content: string } | null>(null);
  const [goodthingUi, setGoodthingUi] = useState<GoodthingUi | null>(null);
  const [goodthingErr, setGoodthingErr] = useState(false);
  const [receipts, setReceipts] = useState<AssignedReceipt[]>([]);
  const [photoSort, setPhotoSort] = useState<"asc" | "desc">("asc");
  const [selectedReceipt, setSelectedReceipt] = useState<number | null>(null);
  const [selectedScript, setSelectedScript] = useState<number | null>(null);
  const [photoImages, setPhotoImages] = useState<PlaceImage[]>([]);
  const [sameExif, setSameExif] = useState(false);
  const [txtFile, setTxtFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [useAutoPool, setUseAutoPool] = useState(false);
  const [existingScriptCount, setExistingScriptCount] = useState<number | null>(null);
  const [autoImages, setAutoImages] = useState<AutoPoolImage[]>([]);
  const [autoFolder, setAutoFolder] = useState<string | null>(null);
  const [reviewEdit, setReviewEdit] = useState<ReviewJobItem | null>(null);
  const [reviewTab, setReviewTab] = useState<"script" | "images" | "visit">("script");
  const [reviewScript, setReviewScript] = useState("");
  const [reviewImages, setReviewImages] = useState<PlaceImage[]>([]);
  const [visitInfo, setVisitInfo] = useState<VisitInfo | null>(null);
  const [visitSelected, setVisitSelected] = useState<Record<string, Set<string>>>({
    reservation: new Set(),
    wait_time: new Set(),
    purpose: new Set(),
    company: new Set(),
    goodthing: new Set(),
  });
  const [visitErr, setVisitErr] = useState("");
  const [pendingEdit, setPendingEdit] = useState<ReviewJobItem | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const reviewImageInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const listMode = pageSize === "all" ? "infinite" : "paged";

  useEffect(() => {
    const close = () => setOpenMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    const stored = loadMainListSettings();
    setSortDir(stored.sort_dir);
    setShowBillingOwner(stored.show_billing_owner);
    setInfiniteLimit(loadMainInfiniteLimit());
    setPageSize(loadMainPageSize());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  const fetchPage = useCallback(async ({
    offset,
    limit,
    append,
  }: {
    offset: number;
    limit: number;
    append: boolean;
  }) => {
    abortRef.current?.abort();
    const aborter = new AbortController();
    abortRef.current = aborter;
    if (!append) setLoading(true);
    loadingMoreRef.current = true;
    setListError(null);
    try {
      const params = new URLSearchParams({
        offset: String(offset),
        limit: String(limit),
        q: debouncedQuery,
        sort_by: "id",
        sort_dir: sortDir,
      });
      const res = await fetch(`/api/management/places?${params}`, {
        cache: "no-store",
        signal: aborter.signal,
      });
      if (res.status === 401) throw new Error("로그인이 필요합니다.");
      const data = (await res.json().catch(() => ({}))) as PlacesResponse;
      if (!res.ok) throw new Error("플레이스 목록을 불러오지 못했습니다.");
      const rows = data.items ?? [];
      setPlaces((current) => (append ? [...current, ...rows] : rows));
      setHasMore(Boolean(data.has_more));
      setNextOffset(data.next_offset ?? offset + rows.length);
      setPagedOffset(offset);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setListError(error instanceof Error ? error.message : "플레이스 목록을 불러오지 못했습니다.");
      if (!append) setPlaces([]);
    } finally {
      loadingMoreRef.current = false;
      setLoading(false);
    }
  }, [debouncedQuery, sortDir]);

  const reloadList = useCallback(() => {
    if (pageSize === "all") {
      setPlaces([]);
      void fetchPage({ offset: 0, limit: infiniteLimit, append: false });
      return;
    }
    void fetchPage({ offset: 0, limit: Number(pageSize), append: false });
  }, [fetchPage, infiniteLimit, pageSize]);

  useEffect(() => {
    reloadList();
    return () => abortRef.current?.abort();
  }, [reloadList, reloadToken]);

  useEffect(() => {
    if (listMode !== "infinite") return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting || !hasMore || loadingMoreRef.current || loading) return;
      void fetchPage({ offset: nextOffset, limit: infiniteLimit, append: true });
    }, { rootMargin: "800px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchPage, hasMore, infiniteLimit, listMode, loading, nextOffset]);

  const openSettings = () => {
    setDraftSortDir(sortDir);
    setDraftBilling(showBillingOwner);
    setDraftInfinite(infiniteLimit);
    setSettingsOpen(true);
  };

  const saveSettings = () => {
    const next: MainListSettings = saveMainListSettings({
      sort_dir: draftSortDir,
      show_billing_owner: draftBilling,
    });
    setSortDir(next.sort_dir);
    setShowBillingOwner(next.show_billing_owner);
    setInfiniteLimit(saveMainInfiniteLimit(draftInfinite));
    setSettingsOpen(false);
  };

  const changePageSize = (value: PageSizeValue) => {
    saveMainPageSize(value);
    setPageSize(value);
  };

  const displayedPlaces = useMemo(() => {
    return places.filter((place) => {
      const done = Number(place.remaining ?? 0) <= 0;
      const active = Number(place.status ?? 1) === 1 && !done;
      return (
        filter === "all" ||
        (filter === "active" && active) ||
        (filter === "done" && done)
      );
    });
  }, [filter, places]);

  const resetFiles = () => {
    setTxtFile(null);
    setZipFile(null);
    setUseAutoPool(false);
    setSameExif(false);
    setExistingScriptCount(null);
    setAutoFolder(null);
    setEditingScript(null);
    setReviewEdit(null);
    setPendingEdit(null);
    setGoodthingErr(false);
    setVisitErr("");
  };

  const openAction = async (place: PlaceItem, action: MenuAction) => {
    setActive(place);
    setOpenMenu(null);
    setNotice(null);
    setBusy(false);
    resetFiles();
    if (action === "download") {
      const params = new URLSearchParams({
        place_name: place.name || "",
        alias: place.alias || "",
      });
      const res = await fetch(`/api/upstream/places/${place.pid}/jobs.xlsx?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        window.alert("다운로드에 실패했습니다.");
        return;
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = `${place.alias || place.name || place.pid}.xlsx`;
      link.click();
      URL.revokeObjectURL(href);
      return;
    }
    setModal(action);
    if (action === "dailycap") setDailycap(String(place.requested ?? place.dailycap ?? 0));
    if (action === "reviews") {
      setReviews([]);
      try {
        const data = await apiJson<ReviewJobItem[]>(`/api/upstream/reviews/by-place/${place.pid}`);
        setReviews(Array.isArray(data) ? data : []);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "리뷰 목록을 불러오지 못했습니다.");
      }
    }
    if (action === "scripts") {
      try {
        const data = await apiJson<AssignedScript[]>(`/api/upstream/places/${place.pid}/assigned-scripts`);
        setScripts(Array.isArray(data) ? data : []);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "원고를 불러오지 못했습니다.");
      }
    }
    if (action === "goodthing") {
      try {
        const data = await apiJson<GoodthingUi>(`/api/upstream/places/${place.pid}/goodthing/ui`);
        if (data.message === "Not Allow") {
          setNotice("비정상적인 접근입니다");
          return;
        }
        setGoodthingUi(data);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "좋았던점을 불러오지 못했습니다.");
      }
    }
    if (action === "photos") {
      try {
        const data = await apiJson<AssignedReceipt[]>(`/api/upstream/places/${place.pid}/assigned-receipts`);
        setReceipts(Array.isArray(data) ? data : []);
        setSelectedReceipt(null);
        setSelectedScript(null);
        setPhotoImages([]);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "영수증 목록을 불러오지 못했습니다.");
      }
    }
    if (action === "overwrite") {
      try {
        const data = await apiJson<{ count?: number }>(`/api/upstream/places/${place.pid}/scripts/count`);
        setExistingScriptCount(Number(data.count ?? 0));
      } catch {
        setExistingScriptCount(null);
      }
    }
    if (action === "uploadAutoImages") {
      await loadAutoImages(place.pid);
    }
  };

  const closeModal = () => {
    setModal(null);
    setActive(null);
    setNotice(null);
    resetFiles();
  };

  const runJson = async (fn: () => Promise<void>, success: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await fn();
      setNotice(success);
      await onRefresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "처리에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const uploadForm = async (url: string, form: FormData) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(url, { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errorMessage(data, "업로드에 실패했습니다."));
      setNotice(summarizeUpload(modal, data));
      await onRefresh();
      if (modal === "uploadAutoImages" && active) await loadAutoImages(active.pid);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "업로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const loadAutoImages = async (placeId: number) => {
    try {
      const data = await apiJson<{ images?: AutoPoolImage[] }>(`/api/upstream/places/${placeId}/auto-images`);
      setAutoImages(Array.isArray(data.images) ? data.images : []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "자동 발행 사진을 불러오지 못했습니다.");
    }
  };

  const loadPhotoImages = async (receiptId: number | null, scriptId: number | null) => {
    setSelectedReceipt(receiptId);
    setSelectedScript(scriptId);
    const url = receiptId
      ? `/api/upstream/review-receipts/${receiptId}/images`
      : `/api/upstream/review-scripts/${scriptId}/images`;
    const data = await apiJson<PlaceImage[]>(url);
    setPhotoImages(Array.isArray(data) ? data : []);
  };

  const uploadPhotoImages = async (files: File[]) => {
    if (!files.length) return;
    if (!selectedReceipt && !selectedScript) {
      window.alert("먼저 항목을 선택하세요.");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      form.append("same_exif", sameExif ? "true" : "false");
      const url = selectedReceipt
        ? `/api/upstream/review-receipts/${selectedReceipt}/images`
        : `/api/upstream/review-scripts/${selectedScript}/images`;
      const res = await fetch(url, { method: "POST", body: form });
      if (!res.ok) throw new Error("업로드 실패");
      await loadPhotoImages(selectedReceipt, selectedScript);
      if (photoInputRef.current) photoInputRef.current.value = "";
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "업로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const deletePhoto = async (imageId: number) => {
    if (!window.confirm(`이미지 #${imageId} 를 삭제할까요?`)) return;
    const url = selectedReceipt
      ? `/api/upstream/review-images/${imageId}`
      : `/api/upstream/review-script-images/${imageId}`;
    await apiJson(url, { method: "DELETE" });
    await loadPhotoImages(selectedReceipt, selectedScript);
  };

  const updateReviewStatus = async (item: ReviewJobItem, status: number) => {
    if (!item.job_id) return;
    setBusy(true);
    try {
      await apiJson("/api/upstream/admin/job/update_status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: item.job_id,
          status,
          receipt_id: item.receipt_id,
        }),
      });
      setReviews((current) =>
        current.map((row) => (row.job_id === item.job_id ? { ...row, status } : row)),
      );
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "상태 변경에 실패했습니다.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openReviewEdit = async (item: ReviewJobItem) => {
    setReviewEdit(item);
    setReviewTab("script");
    setReviewScript("");
    setReviewImages([]);
    setVisitErr("");
    try {
      if (item.script_id) {
        const data = await apiJson<{ content?: string }>(`/api/upstream/review-scripts/${item.script_id}`);
        setReviewScript(data.content ?? "");
      }
      if (item.receipt_id) {
        const imgs = await apiJson<PlaceImage[]>(`/api/upstream/review-receipts/${item.receipt_id}/images`);
        setReviewImages(Array.isArray(imgs) ? imgs : []);
      }
      if (item.job_id) {
        const visit = await apiJson<VisitInfo>(`/api/upstream/admin/review-jobs/${item.job_id}/visit-info`);
        setVisitInfo(visit);
        const selected = visit.selected_survey ?? {};
        setVisitSelected({
          reservation: new Set(selected.reservation ?? []),
          wait_time: new Set(selected.wait_time ?? []),
          purpose: new Set(selected.purpose ?? []),
          company: new Set(selected.company ?? []),
          goodthing: new Set(selected.goodthing ?? []),
        });
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "편집 정보를 불러오지 못했습니다.");
    }
  };

  const patchGoodthing = async (payload: Record<string, string>) => {
    if (!active) return;
    await apiJson(`/api/upstream/places/${active.pid}/goodthing`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  const menuItems = (place: PlaceItem): Array<[MenuAction, string]> => {
    const issueLabel = Number(place.status ?? 1) === 0 ? "발행 시작" : "발행 중지";
    const base: Array<[MenuAction, string]> = [
      ["dailycap", "일일 발행량 수정"],
      ["issue", issueLabel],
      ["hide", "플레이스 숨기기"],
      ["scripts", "원고 수정"],
      ["goodthing", "좋았던점 수정"],
      ["purge", "영수증 전체 삭제"],
    ];
    if (place.auto_post) {
      base.push(
        ["generate", "영수증 이미지 생성"],
        ["uploadScripts", "원고&사진 추가"],
        ["uploadAutoImages", "자동 발행 사진 추가"],
        ["purgeScripts", "원고&사진 삭제"],
      );
    }
    base.push(["overwrite", "원고 교체"]);
    if (place.photo_allowed) base.push(["photos", "사진 추가"]);
    base.push(["manual", "수동 영수증추가"], ["download", "다운로드"]);
    return base;
  };

  const sortedScripts = useMemo(() => sortByRdate(scripts, scriptSort), [scripts, scriptSort]);
  const sortedReceipts = useMemo(() => sortByRdate(receipts, photoSort), [receipts, photoSort]);
  const visibleAutoImages = useMemo(() => {
    if (!autoFolder) {
      const groups = new Map<string, AutoPoolImage>();
      const roots: AutoPoolImage[] = [];
      autoImages.forEach((image) => {
        if (image.group) {
          if (!groups.has(image.group)) groups.set(image.group, image);
        } else {
          roots.push(image);
        }
      });
      return { folders: [...groups.keys()], files: roots };
    }
    return {
      folders: [] as string[],
      files: autoImages.filter((image) => image.group === autoFolder),
    };
  }, [autoImages, autoFolder]);

  const flags = new Set(goodthingUi?.survey_flags ?? []);
  const showReservation = flags.has("reservation") || Boolean(goodthingUi?.reservation_ori_list?.length);
  const showGoodthing = flags.has("goodthing") || Boolean(goodthingUi?.goodthing_ori_list?.length);
  const visitFlags = new Set(visitInfo?.survey_flags ?? []);
  const hasVisitSelected = Object.values(visitSelected).some((set) => set.size > 0);

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-cluster">
          <button type="button" className="icon-button" onClick={openSettings} aria-label="메인 목록 정렬 설정" title="정렬 설정">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
            </svg>
          </button>
          <label className="page-size">
            <span>표시 개수</span>
            <select value={pageSize} onChange={(event) => changePageSize(event.target.value as PageSizeValue)}>
              {PAGE_SIZE_CHOICES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <div className="segmented" role="tablist" aria-label="진행 상태 필터">
            {FILTERS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                className={filter === value ? "active" : ""}
                onClick={() => setFilter(value)}
              >
                {filter === value ? (
                  <motion.span
                    layoutId="place-filter-pill"
                    className="segmented-pill"
                    transition={{ type: "spring", stiffness: 480, damping: 38 }}
                  />
                ) : null}
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
        <label className="search-box">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="플레이스 검색"
          />
        </label>
      </div>

      <div className="table-card">
        {loading ? (
          <div className="empty-panel"><span className="loader" /><p>데이터를 불러오고 있습니다.</p></div>
        ) : (
          <div className="place-table-wrap">
            <table className="place-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>플레이스명</th>
                  <th>플레이스 MID</th>
                  <th>완료</th>
                  <th>인식오류</th>
                  <th>남은 작업량</th>
                  <th>잔여 영수증</th>
                  <th>잔여 원고</th>
                  <th>요청 작업량</th>
                  <th>발행시작</th>
                  <th>오늘 작업량</th>
                  {showBillingOwner ? <th>결제자</th> : null}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {places.map((place, index) => (
                  <tr key={place.pid} className={placeRowClass(place)}>
                    <td>{index + 1}</td>
                    <td>{place.name || place.alias || "—"}</td>
                    <td className="mid-col">{place.mid || "—"}</td>
                    <td>{number(place.done)}</td>
                    <td className={Number(place.error) > 0 ? "error-col" : ""}>{number(place.error)}</td>
                    <td>{number(place.remaining)}</td>
                    <td>{number(place.receipt_count)}</td>
                    <td>{number(place.remaining_scripts)}</td>
                    <td>{number(place.amount ?? place.total)}</td>
                    <td>{formatStartDate(place.start_date)}</td>
                    <td>{number(place.today)} / {number(place.requested)}</td>
                    <td>{place.billing_owner_display || "—"}</td>
                    <td className="actions-col">
                      <div className="action-group">
                        <button className="table-action" onClick={() => void openAction(place, "reviews")}>
                          리뷰목록
                        </button>
                        <div className="menu-wrap">
                          <button
                            className="table-action"
                            onClick={(event) => {
                              event.stopPropagation();
                              setActive(place);
                              setOpenMenu(openMenu === place.pid ? null : place.pid);
                            }}
                          >
                            메뉴
                          </button>
                          {openMenu === place.pid ? (
                            <div className="place-menu" onClick={(event) => event.stopPropagation()}>
                              {menuItems(place).map(([id, label]) => (
                                <button
                                  key={id}
                                  className={id === "purge" || id === "purgeScripts" || (id === "issue" && Number(place.status ?? 1) !== 0) ? "danger" : ""}
                                  onClick={() => void openAction(place, id)}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!places.length ? (
              <div className="empty-panel"><p>조건에 맞는 플레이스가 없습니다.</p></div>
            ) : null}
          </div>
        )}
      </div>

      {modal && active ? (
        <div className="modal-scrim" onClick={closeModal}>
          <div
            className={`app-modal ${modal === "reviews" || modal === "scripts" || modal === "photos" || modal === "uploadAutoImages" || modal === "goodthing" ? "wide" : ""} ${modal === "scripts" || modal === "photos" ? "fullscreen" : ""}`}
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p>{active.name || "—"}</p>
                <h2>{modalTitle(modal, active)}</h2>
              </div>
              <button onClick={closeModal} aria-label="닫기">닫기</button>
            </header>

            <div className="app-modal-body">
              {notice ? <div className="modal-notice">{notice}</div> : null}

              {modal === "reviews" ? (
                <div className="review-table-wrap">
                  <table className="review-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>아이디</th>
                        <th>리뷰 URL</th>
                        <th>리뷰작성날짜</th>
                        <th>영수증날짜</th>
                        <th>상태</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviews.map((item, index) => {
                        const url = reviewUrl(item);
                        const status = Number(item.status ?? 2);
                        return (
                          <tr key={`${item.job_id}-${index}`}>
                            <td>{index + 1}</td>
                            <td>{String(item.username ?? "").slice(0, 3)}</td>
                            <td className="url-col">
                              {url ? <a href={url} target="_blank" rel="noreferrer">{url}</a> : "—"}
                            </td>
                            <td>{item.postdate || "—"}</td>
                            <td>{item.realdate || "—"}</td>
                            <td><em className={`status-pill ${reviewStatusTone(status)}`}>{reviewStatusLabel(status)}</em></td>
                            <td>
                              <div className="review-actions">
                                <button disabled={busy || status === 7} onClick={() => setPendingEdit(item)}>수정요청</button>
                                {status === 7 ? (
                                  <button disabled={busy} onClick={() => void openReviewEdit(item)}>원고수정</button>
                                ) : null}
                                <button disabled={busy || status === 8} onClick={() => void updateReviewStatus(item, 8)}>삭제요청</button>
                                <button disabled={busy || ![5, 6, 7, 8].includes(status)} onClick={() => void updateReviewStatus(item, 2)}>요청취소</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!reviews.length ? <div className="compact-empty">표시할 리뷰가 없습니다.</div> : null}
                </div>
              ) : null}

              {modal === "dailycap" ? (
                <label className="modal-field">
                  일일 발행량 (0 ~ {number(active.amount)})
                  <input type="number" min={0} max={active.amount} value={dailycap} onChange={(event) => setDailycap(event.target.value)} />
                </label>
              ) : null}

              {modal === "issue" ? (
                <p>{Number(active.status ?? 1) === 0 ? "이 플레이스의 발행을 다시 시작할까요?" : "이 플레이스의 발행을 중지할까요?"}</p>
              ) : null}
              {modal === "hide" ? <p>대시보드에서 이 플레이스를 숨길까요? 데이터는 삭제되지 않습니다.</p> : null}
              {modal === "purge" ? <p>사용되지 않은 영수증과 원고를 삭제합니다. 계속할까요?</p> : null}
              {modal === "generate" ? <p>부족한 영수증 이미지를 생성합니다.</p> : null}
              {modal === "purgeScripts" ? (
                <p>
                  미배정 원고와 사진을 삭제합니다. 자동 발행 사진 창고의 사진도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                </p>
              ) : null}

              {modal === "scripts" ? (
                <div className="review-table-wrap">
                  <table className="review-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>
                          <button className="sort-head" onClick={() => setScriptSort(scriptSort === "asc" ? "desc" : "asc")}>
                            영수증날짜 {scriptSort === "asc" ? "↑" : "↓"}
                          </button>
                        </th>
                        <th>영수증 ID</th>
                        <th>내용(미리보기)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedScripts.map((item, index) => (
                        <tr key={item.review_script_id} className={item.status === "edited" ? "is-edited" : ""}>
                          <td>{index + 1}</td>
                          <td>{formatReceiptDateLabel(item.rdate, item.status !== "script_only")}</td>
                          <td>{item.review_script_id}</td>
                          <td className="preview-col">
                            <button
                              className="link-button"
                              onClick={async () => {
                                try {
                                  const data = await apiJson<{ id?: number; content?: string }>(
                                    `/api/upstream/review-scripts/${item.review_script_id}`,
                                  );
                                  setEditingScript({
                                    id: data.id ?? item.review_script_id,
                                    content: data.content ?? item.content ?? "",
                                  });
                                } catch {
                                  setEditingScript({ id: item.review_script_id, content: item.content ?? "" });
                                }
                              }}
                            >
                              {truncate(item.content, 120) || "—"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!sortedScripts.length ? <div className="compact-empty">수정가능한 원고가 없습니다.</div> : null}
                </div>
              ) : null}

              {modal === "goodthing" && goodthingUi ? (
                <div className="chip-sections">
                  {showReservation ? (
                    <ChipSection
                      title="어떻게 이용하셨나요?"
                      options={goodthingUi.reservation_options ?? []}
                      selected={csvSet(goodthingUi.reservation, goodthingUi.reservation_options)}
                      empty="아직 정보를 받지 못했거나 선택할 예약이 없습니다."
                      onToggle={async (option, next) => {
                        setGoodthingUi({ ...goodthingUi, reservation: [...next].join(",") });
                        try {
                          await patchGoodthing({ reservation: [...next].join(",") });
                        } catch {
                          setGoodthingUi(goodthingUi);
                        }
                      }}
                    />
                  ) : null}
                  {flags.has("wait_time") ? (
                    <ChipSection
                      title="대기시간"
                      options={goodthingUi.wait_time_options ?? []}
                      selected={new Set(goodthingUi.wait_time_allowed_list ?? [])}
                      empty="선택 가능한 대기시간 정보가 없습니다."
                      onToggle={async (_option, next) => {
                        const prev = goodthingUi;
                        setGoodthingUi({ ...goodthingUi, wait_time_allowed_list: [...next] });
                        try {
                          await patchGoodthing({ wait_time: [...next].join(",") });
                        } catch {
                          setGoodthingUi(prev);
                        }
                      }}
                    />
                  ) : null}
                  {flags.has("purpose") ? (
                    <ChipSection
                      title="방문 목적"
                      options={goodthingUi.purpose_options ?? []}
                      selected={new Set(goodthingUi.purpose_allowed_list ?? [])}
                      empty="선택 가능한 방문목적 정보가 없습니다."
                      onToggle={async (_option, next) => {
                        const prev = goodthingUi;
                        setGoodthingUi({ ...goodthingUi, purpose_allowed_list: [...next] });
                        try {
                          await patchGoodthing({ purpose: [...next].join(",") });
                        } catch {
                          setGoodthingUi(prev);
                        }
                      }}
                    />
                  ) : null}
                  {flags.has("company") ? (
                    <ChipSection
                      title="누구와 함께"
                      options={goodthingUi.company_options ?? []}
                      selected={new Set(goodthingUi.company_allowed_list ?? [])}
                      empty="선택 가능한 동행자 정보가 없습니다."
                      onToggle={async (_option, next) => {
                        const prev = goodthingUi;
                        setGoodthingUi({ ...goodthingUi, company_allowed_list: [...next] });
                        try {
                          await patchGoodthing({ company: [...next].join(",") });
                        } catch {
                          setGoodthingUi(prev);
                        }
                      }}
                    />
                  ) : null}
                  {showGoodthing ? (
                    <section className="chip-section">
                      <strong>&quot;제외&quot; 할 아이템만 선택하세요</strong>
                      <p>(리뷰 작성간 랜덤으로 3~4개를 선택합니다)</p>
                      <p>(체크되지 않은 아이템이 최소 4개 이상 있어야 합니다!)</p>
                      <div className="chip-row">
                        {(goodthingUi.goodthing_ori_list ?? []).map((item) => {
                          const excluded = new Set(goodthingUi.goodthing_exclude_list ?? []);
                          const isExcluded = excluded.has(item);
                          return (
                            <button
                              key={item}
                              className={`gt-chip ${isExcluded ? "good-red" : "good-blue"}`}
                              onClick={async () => {
                                setGoodthingErr(false);
                                const next = new Set(excluded);
                                if (isExcluded) next.delete(item);
                                else next.add(item);
                                setGoodthingUi({ ...goodthingUi, goodthing_exclude_list: [...next] });
                                try {
                                  await patchGoodthing({ goodthing: [...next].join(",") });
                                } catch {
                                  setGoodthingUi(goodthingUi);
                                  setGoodthingErr(true);
                                }
                              }}
                            >
                              {item}
                            </button>
                          );
                        })}
                      </div>
                      {!(goodthingUi.goodthing_ori_list ?? []).length ? (
                        <p>아직 정보를 받지 못했거나 선택할 좋은점이 없습니다.</p>
                      ) : null}
                      {goodthingErr ? <p className="gt-danger">제외하지 않은 항목이 최소 4개 이상이어야 합니다.</p> : null}
                    </section>
                  ) : null}
                </div>
              ) : null}

              {modal === "uploadScripts" ? (
                <div className="upload-fields">
                  <p>TXT 원고는 필수, 사진 ZIP은 선택입니다. (영수증 생성/매칭은 하지 않음)</p>
                  <label className="modal-field">원고 첨부파일 (TXT)<input type="file" accept=".txt" onChange={(event) => setTxtFile(event.target.files?.[0] ?? null)} /></label>
                  <label className="modal-field">
                    사진 첨부파일 (ZIP, 선택)
                    <input type="file" accept=".zip" disabled={useAutoPool} onChange={(event) => setZipFile(event.target.files?.[0] ?? null)} />
                  </label>
                  <label className="check-row">
                    <input type="checkbox" checked={useAutoPool} onChange={(event) => { setUseAutoPool(event.target.checked); if (event.target.checked) setZipFile(null); }} />
                    사진 ZIP 대신 자동 발행 사진 창고 사용
                  </label>
                </div>
              ) : null}

              {modal === "overwrite" ? (
                <div className="upload-fields">
                  <p>TXT 파일을 업로드하면 원고 가공 처리 후, 해당 플레이스에 등록된 기존 원고를 위에서부터 순서대로 덮어씁니다.</p>
                  <p>현재 원고 수: {existingScriptCount == null ? "—" : number(existingScriptCount)}</p>
                  <label className="modal-field">원고 TXT<input type="file" accept=".txt" onChange={(event) => setTxtFile(event.target.files?.[0] ?? null)} /></label>
                </div>
              ) : null}

              {modal === "manual" ? (
                <div className="upload-fields">
                  <label className="modal-field">ZIP 파일<input type="file" accept=".zip" onChange={(event) => setZipFile(event.target.files?.[0] ?? null)} /></label>
                  <label className="check-row">
                    <input type="checkbox" checked={sameExif} onChange={(event) => setSameExif(event.target.checked)} />
                    폴더별로 동일 EXIF 적용
                  </label>
                </div>
              ) : null}

              {modal === "uploadAutoImages" ? (
                <div className="upload-fields">
                  <p>자동 발행용 사진 창고에 미리 넣어두는 기능입니다. ZIP 루트 이미지는 개별 항목으로, 폴더 안 이미지는 폴더 단위로 보관됩니다.</p>
                  <label className="modal-field">사진 첨부파일 (ZIP)<input type="file" accept=".zip" onChange={(event) => setZipFile(event.target.files?.[0] ?? null)} /></label>
                  <div className="photo-toolbar">
                    <strong>등록된 자동 발행 이미지</strong>
                    {autoFolder ? <button className="ghost" onClick={() => setAutoFolder(null)}>뒤로가기</button> : null}
                    <span>{autoFolder ? autoFolder : "루트"} · {visibleAutoImages.files.length + visibleAutoImages.folders.length}건</span>
                  </div>
                  <div className="image-grid">
                    {visibleAutoImages.folders.map((folder) => (
                      <button key={folder} className="image-card folder" onClick={() => setAutoFolder(folder)}>
                        <span>{folder}</span>
                      </button>
                    ))}
                    {visibleAutoImages.files.map((image) => (
                      <div key={image.name} className="image-card">
                        <img src={mediaSrc(image.url)} alt={image.basename || image.name} draggable={false} />
                        <small>{image.basename || image.name}</small>
                      </div>
                    ))}
                  </div>
                  {!visibleAutoImages.files.length && !visibleAutoImages.folders.length ? (
                    <div className="compact-empty">등록된 이미지가 없습니다.</div>
                  ) : null}
                </div>
              ) : null}

              {modal === "photos" ? (
                <div className="photo-manager">
                  <div className="review-table-wrap">
                    <table className="review-table">
                      <thead>
                        <tr>
                          <th>
                            <button className="sort-head" onClick={() => setPhotoSort(photoSort === "asc" ? "desc" : "asc")}>
                              영수증날짜 {photoSort === "asc" ? "↑" : "↓"}
                            </button>
                          </th>
                          <th>영수증 ID</th>
                          <th>원고 ID</th>
                          <th>내용(미리보기)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedReceipts.map((item) => (
                          <tr
                            key={`${item.receipt_id}-${item.review_script_id}`}
                            className={`${item.status === "edited" ? "is-edited" : ""} ${selectedReceipt === (item.receipt_id ?? null) && selectedScript === (item.review_script_id ?? null) ? "is-selected" : ""}`}
                          >
                            <td>{formatReceiptDateLabel(item.rdate, Boolean(item.receipt_id))}</td>
                            <td>{item.receipt_id ?? "—"}</td>
                            <td>{item.review_script_id ?? "—"}</td>
                            <td className="preview-col">
                              <button
                                className="link-button"
                                title={item.content || ""}
                                onClick={() => void loadPhotoImages(item.receipt_id ?? null, item.review_script_id ?? null)}
                              >
                                {item.content || "—"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!sortedReceipts.length ? <div className="compact-empty">assigned 상태의 원고가 없습니다.</div> : null}
                  </div>
                  <div
                    className="photo-dropzone"
                    onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const files = Array.from(event.dataTransfer.files || []);
                      if (files.length) void uploadPhotoImages(files);
                    }}
                  >
                    <div className="photo-toolbar">
                      <h3>
                        {selectedReceipt
                          ? `이미지(영수증#${selectedReceipt} / 원고#${selectedScript ?? "—"})`
                          : selectedScript
                            ? `이미지(원고#${selectedScript} / 영수증 미배정)`
                            : "이미지"}
                      </h3>
                      <label className="check-row">
                        <input type="checkbox" checked={sameExif} onChange={(event) => setSameExif(event.target.checked)} />
                        이미지 2개 이상 업로드시 체크하세요
                      </label>
                      <input ref={photoInputRef} type="file" accept=".jpg,.jpeg,.png" multiple />
                      <button
                        className="solid-button"
                        disabled={busy}
                        onClick={() => {
                          const files = Array.from(photoInputRef.current?.files ?? []);
                          void uploadPhotoImages(files);
                        }}
                      >
                        업로드
                      </button>
                    </div>
                    <p className="drop-hint">이미지를 이 영역에 드래그&드롭하면 바로 업로드됩니다. (jpg 파일만 업로드 가능합니다.)</p>
                    <ImageGrid images={photoImages} onDelete={(id) => void deletePhoto(id)} />
                  </div>
                </div>
              ) : null}
            </div>

            {modal !== "reviews" && modal !== "scripts" && modal !== "goodthing" && modal !== "photos" ? (
              <footer>
                <button className="ghost" onClick={closeModal}>취소</button>
                <button
                  className="solid-button"
                  disabled={busy}
                  onClick={() => {
                    if (!active) return;
                    if (modal === "dailycap") {
                      void runJson(async () => {
                        await apiJson(`/api/upstream/place/${active.pid}/dailycap`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ dailycap: Number(dailycap) }),
                        });
                      }, "일일 발행량을 저장했습니다.");
                    }
                    if (modal === "issue") {
                      void runJson(async () => {
                        await apiJson(`/api/upstream/places/${active.pid}/issue-status`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: Number(active.status ?? 1) === 0 ? 1 : 0 }),
                        });
                      }, "발행 상태를 변경했습니다.");
                    }
                    if (modal === "hide") {
                      void runJson(async () => {
                        await apiJson("/api/upstream/ui/hidden-places/hide-one", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ alias: active.alias }),
                        });
                      }, "플레이스를 숨겼습니다.");
                    }
                    if (modal === "purge") {
                      void runJson(async () => {
                        await apiJson(`/api/upstream/places/${active.pid}/purge-receipts`, { method: "DELETE" });
                      }, "영수증을 삭제했습니다.");
                    }
                    if (modal === "generate") {
                      void runJson(async () => {
                        await apiJson(`/api/upstream/admin/tasks/auto-post/places/${active.pid}/generate/start`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: "{}",
                        });
                      }, "이미지 생성을 시작했습니다.");
                    }
                    if (modal === "purgeScripts") {
                      void runJson(async () => {
                        const data = await apiJson<Record<string, unknown>>(`/api/upstream/places/${active.pid}/scripts/purge-txt`, { method: "POST" });
                        setNotice(
                          `원고 삭제: ${data.deleted_scripts ?? 0}건 / 사진 레코드: ${data.deleted_images ?? 0}건`,
                        );
                      }, "원고와 사진을 삭제했습니다.");
                    }
                    if (modal === "uploadScripts" && txtFile) {
                      const form = new FormData();
                      form.append("txt_file", txtFile);
                      if (useAutoPool) form.append("use_auto_image_pool", "true");
                      if (zipFile) form.append("zip_file", zipFile);
                      void uploadForm(`/api/upstream/places/${active.pid}/scripts/upload-txt`, form);
                    }
                    if (modal === "uploadAutoImages" && zipFile) {
                      const form = new FormData();
                      form.append("zip_file", zipFile);
                      void uploadForm(`/api/upstream/places/${active.pid}/auto-images/upload`, form);
                    }
                    if (modal === "overwrite" && txtFile) {
                      const form = new FormData();
                      form.append("txt_file", txtFile);
                      void uploadForm(`/api/upstream/places/${active.pid}/scripts/overwrite-txt`, form);
                    }
                    if (modal === "manual" && zipFile) {
                      const form = new FormData();
                      form.append("zip_file", zipFile);
                      form.append("same_exif_per_folder", sameExif ? "true" : "false");
                      void uploadForm(`/api/upstream/places/${active.pid}/manual-upload`, form);
                    }
                  }}
                >
                  {busy ? "처리 중" : "확인"}
                </button>
              </footer>
            ) : null}
          </div>
        </div>
      ) : null}

      {editingScript ? (
        <div className="modal-scrim nested" onClick={() => setEditingScript(null)}>
          <div className="app-modal" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <p>{active?.name}</p>
                <h2>원고 #{editingScript.id} 편집</h2>
              </div>
              <button onClick={() => setEditingScript(null)}>닫기</button>
            </header>
            <div className="app-modal-body">
              <textarea className="modal-textarea" rows={12} value={editingScript.content} onChange={(event) => setEditingScript({ ...editingScript, content: event.target.value })} />
            </div>
            <footer>
              <button className="ghost" onClick={() => setEditingScript(null)}>닫기</button>
              <button
                className="solid-button"
                disabled={busy}
                onClick={() => {
                  void runJson(async () => {
                    await apiJson(`/api/upstream/review-scripts/${editingScript.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ content: editingScript.content }),
                    });
                    setScripts((current) =>
                      current.map((item) =>
                        item.review_script_id === editingScript.id
                          ? { ...item, content: editingScript.content, status: "edited" }
                          : item,
                      ),
                    );
                    setEditingScript(null);
                  }, "원고를 저장했습니다.");
                }}
              >
                수정 저장
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {pendingEdit ? (
        <div className="modal-scrim nested" onClick={() => setPendingEdit(null)}>
          <div className="app-modal" onClick={(event) => event.stopPropagation()}>
            <header>
              <div><h2>수정요청</h2></div>
              <button onClick={() => setPendingEdit(null)}>닫기</button>
            </header>
            <div className="app-modal-body">
              <p>이 리뷰를 수정요청 상태로 변경하고 원고/이미지/방문정보를 편집할까요?</p>
            </div>
            <footer>
              <button className="ghost" onClick={() => setPendingEdit(null)}>취소</button>
              <button
                className="solid-button"
                disabled={busy}
                onClick={async () => {
                  const item = pendingEdit;
                  const ok = await updateReviewStatus(item, 7);
                  setPendingEdit(null);
                  if (ok) await openReviewEdit({ ...item, status: 7 });
                }}
              >
                확인
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {reviewEdit ? (
        <div className="modal-scrim nested" onClick={() => setReviewEdit(null)}>
          <div className="app-modal wide" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <p>{active?.name}</p>
                <h2>원고/이미지/방문정보 관리</h2>
              </div>
              <button onClick={() => setReviewEdit(null)}>닫기</button>
            </header>
            <div className="app-modal-body">
              <div className="tab-row">
                {([["script", "원고 수정"], ["images", "이미지 관리"], ["visit", "방문정보"]] as const).map(([id, label]) => (
                  <button key={id} className={reviewTab === id ? "active" : ""} onClick={() => setReviewTab(id)}>{label}</button>
                ))}
              </div>
              {reviewTab === "script" ? (
                <div className="upload-fields">
                  <div className="photo-toolbar">
                    <span>원고#{reviewEdit.script_id ?? "—"}</span>
                    <button
                      className="solid-button"
                      disabled={busy || !reviewEdit.script_id}
                      onClick={() => {
                        if (!reviewEdit.script_id) return;
                        void runJson(async () => {
                          await apiJson(`/api/upstream/review-scripts/${reviewEdit.script_id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ content: reviewScript }),
                          });
                        }, "원고가 저장되었습니다.");
                      }}
                    >
                      수정 저장
                    </button>
                  </div>
                  <textarea className="modal-textarea" rows={14} value={reviewScript} onChange={(event) => setReviewScript(event.target.value)} />
                </div>
              ) : null}
              {reviewTab === "images" ? (
                <div
                  className="photo-dropzone"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const files = Array.from(event.dataTransfer.files || []);
                    if (!files.length || !reviewEdit.receipt_id) return;
                    void (async () => {
                      const form = new FormData();
                      files.forEach((file) => form.append("files", file));
                      form.append("same_exif", sameExif ? "true" : "false");
                      await fetch(`/api/upstream/review-receipts/${reviewEdit.receipt_id}/images`, { method: "POST", body: form });
                      const imgs = await apiJson<PlaceImage[]>(`/api/upstream/review-receipts/${reviewEdit.receipt_id}/images`);
                      setReviewImages(Array.isArray(imgs) ? imgs : []);
                    })();
                  }}
                >
                  <div className="photo-toolbar">
                    <span>영수증#{reviewEdit.receipt_id ?? "—"} / 원고#{reviewEdit.script_id ?? "—"}</span>
                    <label className="check-row">
                      <input type="checkbox" checked={sameExif} onChange={(event) => setSameExif(event.target.checked)} />
                      이미지 2개 이상 업로드시 체크하세요
                    </label>
                    <input ref={reviewImageInputRef} type="file" accept=".jpg,.jpeg,.png" multiple />
                    <button
                      className="solid-button"
                      disabled={busy || !reviewEdit.receipt_id}
                      onClick={async () => {
                        const files = Array.from(reviewImageInputRef.current?.files ?? []);
                        if (!files.length || !reviewEdit.receipt_id) return;
                        const form = new FormData();
                        files.forEach((file) => form.append("files", file));
                        form.append("same_exif", sameExif ? "true" : "false");
                        await fetch(`/api/upstream/review-receipts/${reviewEdit.receipt_id}/images`, { method: "POST", body: form });
                        const imgs = await apiJson<PlaceImage[]>(`/api/upstream/review-receipts/${reviewEdit.receipt_id}/images`);
                        setReviewImages(Array.isArray(imgs) ? imgs : []);
                        if (reviewImageInputRef.current) reviewImageInputRef.current.value = "";
                      }}
                    >
                      업로드
                    </button>
                  </div>
                  <p className="drop-hint">이미지를 이 영역에 드래그&드롭하면 바로 업로드됩니다. (jpg 파일만 업로드 가능합니다.)</p>
                  <ImageGrid
                    images={reviewImages}
                    onDelete={async (id) => {
                      if (!window.confirm(`이미지 #${id} 를 삭제할까요?`)) return;
                      await apiJson(`/api/upstream/review-images/${id}`, { method: "DELETE" });
                      if (!reviewEdit.receipt_id) return;
                      const imgs = await apiJson<PlaceImage[]>(`/api/upstream/review-receipts/${reviewEdit.receipt_id}/images`);
                      setReviewImages(Array.isArray(imgs) ? imgs : []);
                    }}
                  />
                </div>
              ) : null}
              {reviewTab === "visit" ? (
                <div className="chip-sections">
                  <div className="photo-toolbar">
                    <span>작업#{reviewEdit.job_id ?? "—"}</span>
                    <button
                      className="solid-button"
                      disabled={busy || !reviewEdit.job_id}
                      onClick={() => {
                        if (visitFlags.has("goodthing") && (visitSelected.goodthing.size < 1 || visitSelected.goodthing.size > 5)) {
                          setVisitErr("좋았던점은 최소 1개, 최대 5개까지 선택해야 합니다.");
                          return;
                        }
                        void runJson(async () => {
                          await apiJson(`/api/upstream/admin/review-jobs/${reviewEdit.job_id}/visit-info`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              selected_survey: {
                                reservation: [...visitSelected.reservation],
                                wait_time: [...visitSelected.wait_time],
                                purpose: [...visitSelected.purpose],
                                company: [...visitSelected.company],
                                goodthing: [...visitSelected.goodthing],
                              },
                            }),
                          });
                        }, "방문정보를 저장했습니다.");
                      }}
                    >
                      방문정보 저장
                    </button>
                  </div>
                  {!hasVisitSelected ? (
                    <p>이 작업은 방문정보 기록 기능 적용 전에 완료되어, 기존 선택값이 저장되어 있지 않습니다. 아래 목록에서 새로 선택 후 저장할 수 있습니다.</p>
                  ) : null}
                  {visitFlags.has("reservation") ? (
                    <ChipSection
                      title="어떻게 이용하셨나요?"
                      options={visitInfo?.options?.reservation ?? []}
                      selected={visitSelected.reservation}
                      single
                      empty="선택 가능한 이용방법 정보가 없습니다."
                      onToggle={(_option, next) => setVisitSelected({ ...visitSelected, reservation: next })}
                    />
                  ) : null}
                  {visitFlags.has("wait_time") ? (
                    <ChipSection
                      title="대기시간"
                      options={visitInfo?.options?.wait_time ?? []}
                      selected={visitSelected.wait_time}
                      single
                      empty="선택 가능한 대기시간 정보가 없습니다."
                      onToggle={(_option, next) => setVisitSelected({ ...visitSelected, wait_time: next })}
                    />
                  ) : null}
                  {visitFlags.has("purpose") ? (
                    <ChipSection
                      title="방문 목적"
                      options={visitInfo?.options?.purpose ?? []}
                      selected={visitSelected.purpose}
                      empty="선택 가능한 방문목적 정보가 없습니다."
                      onToggle={(_option, next) => setVisitSelected({ ...visitSelected, purpose: next })}
                    />
                  ) : null}
                  {visitFlags.has("company") ? (
                    <ChipSection
                      title="누구와 함께"
                      options={visitInfo?.options?.company ?? []}
                      selected={visitSelected.company}
                      empty="선택 가능한 동행자 정보가 없습니다."
                      onToggle={(_option, next) => setVisitSelected({ ...visitSelected, company: next })}
                    />
                  ) : null}
                  {visitFlags.has("goodthing") ? (
                    <section className="chip-section">
                      <div className="photo-toolbar">
                        <strong>어떤 점이 좋았는지 선택해주세요!</strong>
                        <span>{visitSelected.goodthing.size}/5</span>
                      </div>
                      <p>최소 1개, 최대 5개까지 선택할 수 있습니다.</p>
                      <div className="chip-row">
                        {(visitInfo?.options?.goodthing ?? []).map((item) => (
                          <button
                            key={item}
                            className={`gt-chip ${visitSelected.goodthing.has(item) ? "visit-selected" : "visit-unselected"}`}
                            onClick={() => {
                              setVisitErr("");
                              const next = new Set(visitSelected.goodthing);
                              if (next.has(item)) next.delete(item);
                              else if (next.size >= 5) {
                                setVisitErr("좋았던점은 최대 5개까지만 선택할 수 있습니다.");
                                return;
                              } else next.add(item);
                              setVisitSelected({ ...visitSelected, goodthing: next });
                            }}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                      {visitErr ? <p className="gt-danger">{visitErr}</p> : null}
                    </section>
                  ) : null}
                </div>
              ) : null}
            </div>
            <footer>
              <button className="ghost" onClick={() => setReviewEdit(null)}>닫기</button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}

function modalTitle(modal: MenuAction, place: PlaceItem) {
  if (modal === "reviews") return "리뷰 목록";
  if (modal === "dailycap") return "일일 발행량 수정";
  if (modal === "issue") return Number(place.status ?? 1) === 0 ? "발행 시작" : "발행 중지";
  if (modal === "hide") return "플레이스 숨기기";
  if (modal === "scripts") return `${place.name || "플레이스"} 원고 수정`;
  if (modal === "goodthing") return "리뷰 세부사항 수정";
  if (modal === "purge") return "영수증 전체 삭제";
  if (modal === "generate") return "영수증 이미지 생성";
  if (modal === "uploadScripts") return "원고&사진 추가";
  if (modal === "uploadAutoImages") return `${place.name || "플레이스"} 자동 발행 사진 추가`;
  if (modal === "purgeScripts") return "원고&사진 삭제";
  if (modal === "overwrite") return `${place.name || "플레이스"} 원고 교체`;
  if (modal === "photos") return `${place.name || "플레이스"} 사진 관리`;
  if (modal === "manual") return `${place.name || "플레이스"} 원고 수동 업로드`;
  return "";
}

function summarizeUpload(modal: MenuAction | null, data: Record<string, unknown>) {
  if (modal === "manual") {
    return `완료: 폴더 ${data.folders_processed ?? 0}개, 스크립트 ${data.scripts_created ?? 0}건, 영수증 ${data.receipts_created ?? 0}건, 추가이미지 ${data.images_created ?? 0}건`;
  }
  if (modal === "uploadScripts") {
    return `완료: 원고 ${data.created ?? 0}건 등록 (중복 제외 ${data.skipped_duplicates ?? 0}), 사진 매핑 ${data.images_mapped ?? 0}개`;
  }
  if (modal === "overwrite") return "원고를 교체했습니다.";
  if (modal === "uploadAutoImages") return "자동 발행 사진을 추가했습니다.";
  return "처리가 완료되었습니다.";
}

function ChipSection({
  title,
  options,
  selected,
  empty,
  single = false,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: Set<string>;
  empty: string;
  single?: boolean;
  onToggle: (option: string, next: Set<string>) => void | Promise<void>;
}) {
  return (
    <section className="chip-section">
      <strong>{title}</strong>
      <div className="chip-row">
        {options.map((option) => {
          const on = selected.has(option);
          return (
            <button
              key={option}
              className={`gt-chip ${on ? "resv-selected" : "resv-unselected"}`}
              onClick={() => {
                const next = new Set(selected);
                if (single) {
                  next.clear();
                  next.add(option);
                } else if (on) next.delete(option);
                else next.add(option);
                void onToggle(option, next);
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
      {!options.length ? <p>{empty}</p> : null}
    </section>
  );
}

function ImageGrid({
  images,
  onDelete,
}: {
  images: PlaceImage[];
  onDelete: (id: number) => void | Promise<void>;
}) {
  if (!images.length) return <div className="compact-empty">등록된 이미지가 없습니다.</div>;
  return (
    <div className="image-grid">
      {images.map((image) => (
        <div key={image.id} className="image-card">
          <button className="image-del" onClick={() => void onDelete(image.id)} aria-label={`이미지 ${image.id} 삭제`}>×</button>
          <img src={mediaSrc(image.url, image.filename)} alt={`img #${image.id}`} draggable={false} />
          <small>img #{image.id}</small>
        </div>
      ))}
    </div>
  );
}
