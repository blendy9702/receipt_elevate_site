import { EXTERNAL_API } from "@/lib/external-api";

type ReviewSsoResult =
  | { ok: true; ticket: string }
  | { ok: false; status: number; detail: string };

type SessionLoginResult =
  | {
      ok: true;
      username: string;
      role?: "admin" | "parent" | "child";
      sessionCookie: string;
    }
  | { ok: false; status: number; detail: string };

export async function issueReviewSsoTicket(
  username: string,
): Promise<ReviewSsoResult> {
  const sharedSecret = process.env.SSO_SHARED_SECRET?.trim();
  if (!sharedSecret) {
    return {
      ok: false,
      status: 503,
      detail: "SSO_SHARED_SECRET이 설정되지 않았습니다.",
    };
  }

  const upstream = await fetch(EXTERNAL_API.ssoIssue, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-SSO-Secret": sharedSecret,
    },
    body: JSON.stringify({
      username,
      audience: EXTERNAL_API.reviewAudience,
      entry_url: EXTERNAL_API.reviewSsoEntry,
    }),
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));
  const ticket = typeof data?.ticket === "string" ? data.ticket : "";

  if (!upstream.ok || !ticket) {
    return {
      ok: false,
      status: upstream.ok ? 502 : upstream.status,
      detail:
        data?.detail ?? data?.message ?? "SSO 티켓 발급에 실패했습니다.",
    };
  }

  return { ok: true, ticket };
}

export async function establishReviewSession(
  ticket: string,
): Promise<SessionLoginResult> {
  const upstream = await fetch(EXTERNAL_API.ssoSessionLogin, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticket,
      audience: EXTERNAL_API.reviewAudience,
    }),
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));
  const username =
    typeof data?.user?.username === "string" ? data.user.username.trim() : "";
  const role =
    data?.user?.role === "admin" ||
    data?.user?.role === "parent" ||
    data?.user?.role === "child"
      ? data.user.role
      : undefined;
  const sessionCookie = upstream.headers.get("set-cookie") || "";

  if (!upstream.ok || !username || !sessionCookie) {
    return {
      ok: false,
      status: upstream.ok ? 502 : upstream.status,
      detail:
        data?.detail ?? data?.message ?? "세션 생성에 실패했습니다.",
    };
  }

  return {
    ok: true,
    username,
    ...(role ? { role } : {}),
    sessionCookie,
  };
}
