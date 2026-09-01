import { NextResponse } from "next/server";
import { EXTERNAL_API } from "@/lib/external-api";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(EXTERNAL_API.reviewSessionCookieName, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
  });
  return response;
}
