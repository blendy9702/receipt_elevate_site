export function number(value: number | null | undefined) {
  return new Intl.NumberFormat("ko-KR").format(Number(value ?? 0));
}

export function errorMessage(data: unknown, fallback: string) {
  if (data && typeof data === "object") {
    const record = data as { detail?: unknown; message?: unknown };
    if (typeof record.message === "string") return record.message;
    if (typeof record.detail === "string") return record.detail;
    if (record.detail && typeof record.detail === "object") {
      const nested = record.detail as { message?: unknown };
      if (typeof nested.message === "string") return nested.message;
    }
  }
  return fallback;
}

export async function apiJson<T = unknown>(url: string, init?: RequestInit) {
  const res = await fetch(url, { cache: "no-store", ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorMessage(data, "요청에 실패했습니다."));
  return data as T;
}

export function mediaSrc(url?: string | null, filename?: string | null) {
  const raw = (url || (filename ? `/${String(filename).replace(/^\/+/, "")}` : "")).trim();
  if (!raw) return "";
  if (raw.startsWith("/api/")) return `/api/upstream/${raw.slice(5)}`;
  return raw;
}

function isManualReceiptDate(value?: string | null) {
  return String(value || "").startsWith("9999-12-31");
}

export function formatReceiptDateTime(value?: string | null) {
  if (!value) return null;
  if (isManualReceiptDate(value)) return value;
  const dateStr = String(value);
  try {
    if (dateStr.includes("T")) {
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) return null;
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const hh = String(date.getHours()).padStart(2, "0");
      const mm = String(date.getMinutes()).padStart(2, "0");
      const ss = String(date.getSeconds()).padStart(2, "0");
      return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
    }
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) return dateStr;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return `${dateStr} 00:00:00`;
    return null;
  } catch {
    return null;
  }
}

export function formatReceiptDateLabel(value?: string | null, hasReceipt = true) {
  if (!hasReceipt) return "영수증 미배정";
  if (!value || isManualReceiptDate(value)) return "수동등록";
  return formatReceiptDateTime(value) || "수동등록";
}

export function truncate(text?: string | null, n = 120) {
  const value = String(text || "");
  return value.length > n ? `${value.slice(0, n)}…` : value;
}

export function reviewStatusLabel(status?: number | null) {
  switch (Number(status)) {
    case 2: return "완료";
    case 5: return "삭제등록";
    case 6: return "수정등록";
    case 7: return "수정요청";
    case 8: return "삭제요청";
    case 9: return "작업중단(포인트부족)";
    default: return `상태:${Number(status) || 0}`;
  }
}

export function reviewStatusTone(status?: number | null) {
  switch (Number(status)) {
    case 2: return "ok";
    case 5:
    case 8: return "danger";
    case 6:
    case 7: return "warn";
    default: return "mute";
  }
}
