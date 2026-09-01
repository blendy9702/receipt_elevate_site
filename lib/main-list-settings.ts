export type SortDir = "asc" | "desc";
export type PageSizeValue = "all" | "5" | "10" | "20" | "30" | "40" | "50";

export type MainListSettings = {
  sort_dir: SortDir;
  show_billing_owner: boolean;
};

const SETTINGS_KEY = "mainListSettings.v1";
const PAGE_SIZE_KEY = "mainListPageSize.v1";
const INFINITE_LIMIT_KEY = "mainListInfiniteLimit.v1";
const PAGE_SIZE_OPTIONS: PageSizeValue[] = ["all", "5", "10", "20", "30", "40", "50"];

export function normalizeInfiniteLimit(value: unknown) {
  const n = parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(n)) return 500;
  const clamped = Math.min(1000, Math.max(200, n));
  const snapped = Math.round(clamped / 100) * 100;
  return Math.min(1000, Math.max(200, snapped));
}

export function loadMainListSettings(): MainListSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") as Partial<MainListSettings>;
    return {
      sort_dir: parsed?.sort_dir === "desc" ? "desc" : "asc",
      show_billing_owner: parsed?.show_billing_owner === true,
    };
  } catch {
    return { sort_dir: "asc", show_billing_owner: false };
  }
}

export function saveMainListSettings(next: MainListSettings): MainListSettings {
  const payload: MainListSettings = {
    sort_dir: next.sort_dir === "desc" ? "desc" : "asc",
    show_billing_owner: next.show_billing_owner === true,
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
  return payload;
}

export function loadMainPageSize(): PageSizeValue {
  try {
    const raw = String(localStorage.getItem(PAGE_SIZE_KEY) || "").trim() as PageSizeValue;
    return PAGE_SIZE_OPTIONS.includes(raw) ? raw : "20";
  } catch {
    return "20";
  }
}

export function saveMainPageSize(value: PageSizeValue) {
  localStorage.setItem(PAGE_SIZE_KEY, value);
}

export function loadMainInfiniteLimit() {
  try {
    return normalizeInfiniteLimit(localStorage.getItem(INFINITE_LIMIT_KEY));
  } catch {
    return 500;
  }
}

export function saveMainInfiniteLimit(value: unknown) {
  const n = normalizeInfiniteLimit(value);
  localStorage.setItem(INFINITE_LIMIT_KEY, String(n));
  return n;
}

export const PAGE_SIZE_CHOICES: Array<[PageSizeValue, string]> = [
  ["all", "전체"],
  ["5", "5개씩"],
  ["10", "10개씩"],
  ["20", "20개씩"],
  ["30", "30개씩"],
  ["40", "40개씩"],
  ["50", "50개씩"],
];
