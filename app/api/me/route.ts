import { NextResponse } from "next/server";
import { EXTERNAL_API } from "@/lib/external-api";
import { buildProxyAuthHeaders } from "@/lib/proxy-auth";

export async function GET() {
  try {
    const auth = await buildProxyAuthHeaders();
    if (!auth.ok) {
      return NextResponse.json({ detail: auth.detail }, { status: auth.status });
    }

    const res = await fetch(`${EXTERNAL_API.authBase}/api/external/sso/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...auth.headers,
      },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[api/me] error:", error);
    return NextResponse.json(
      { detail: "세션 정보를 불러오지 못했습니다." },
      { status: 502 },
    );
  }
}
