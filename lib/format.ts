export function number(value: number | null | undefined) {
  return new Intl.NumberFormat("ko-KR").format(Number(value ?? 0));
}

export function dateTime(value?: string | null) {
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

export function roleLabel(role?: string | null) {
  if (role === "parent") return "부모 계정";
  if (role === "child") return "하위 계정";
  if (role === "admin") return "관리자";
  return role || "";
}

export function isUnauthorized(responses: Response | Response[]) {
  const list = Array.isArray(responses) ? responses : [responses];
  return list.some((response) => response.status === 401);
}

export function goLoginIfUnauthorized(responses: Response | Response[]) {
  if (!isUnauthorized(responses)) return false;
  if (typeof window !== "undefined") {
    window.location.replace("/login");
  }
  return true;
}
