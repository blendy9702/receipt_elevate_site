import { NextRequest, NextResponse } from "next/server";
import { EXTERNAL_API } from "@/lib/external-api";
import {
  establishReviewSession,
  issueReviewSsoTicket,
} from "@/lib/review-sso";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const username =
      typeof body?.username === "string" ? body.username.trim() : "";
    const password =
      typeof body?.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, message: "아이디와 비밀번호를 입력해 주세요." },
        { status: 400 },
      );
    }

    const upstream = await fetch(EXTERNAL_API.login, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return NextResponse.json(
        {
          ok: false,
          message:
            data?.message ?? data?.detail ?? "로그인에 실패했습니다.",
        },
        { status: upstream.status },
      );
    }

    const issuedTicket = await issueReviewSsoTicket(username);
    if (!issuedTicket.ok) {
      return NextResponse.json(
        { ok: false, message: issuedTicket.detail },
        { status: issuedTicket.status },
      );
    }

    const sessionLogin = await establishReviewSession(issuedTicket.ticket);
    if (!sessionLogin.ok) {
      return NextResponse.json(
        { ok: false, message: sessionLogin.detail },
        { status: sessionLogin.status },
      );
    }

    const sessionMatch = sessionLogin.sessionCookie.match(
      new RegExp(
        `${EXTERNAL_API.reviewSessionCookieName}=([^;]+)`,
        "i",
      ),
    );
    const sessionValue = sessionMatch?.[1]
      ? decodeURIComponent(sessionMatch[1])
      : "";
    if (!sessionValue) {
      return NextResponse.json(
        { ok: false, message: "세션 쿠키를 파싱하지 못했습니다." },
        { status: 502 },
      );
    }

    const response = NextResponse.json({
      ok: true,
      username: sessionLogin.username,
      role: sessionLogin.role ?? data?.user?.role ?? null,
    });
    response.cookies.set(EXTERNAL_API.reviewSessionCookieName, sessionValue, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      // localhost HTTP 개발에서도 쿠키가 붙도록 Secure는 운영에서만
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (error) {
    console.error("[api/login] error:", error);
    return NextResponse.json(
      { ok: false, message: "로그인 요청 처리에 실패했습니다." },
      { status: 502 },
    );
  }
}
