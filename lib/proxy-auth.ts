import { cookies } from "next/headers";
import { EXTERNAL_API } from "@/lib/external-api";

type ProxyAuthResult =
  | { ok: true; headers: Record<string, string> }
  | { ok: false; status: number; detail: string };

export async function buildProxyAuthHeaders(): Promise<ProxyAuthResult> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(
    EXTERNAL_API.reviewSessionCookieName,
  )?.value;

  if (!sessionCookie) {
    return { ok: false, status: 401, detail: "Not authenticated" };
  }

  return {
    ok: true,
    headers: {
      Cookie: `${EXTERNAL_API.reviewSessionCookieName}=${sessionCookie}`,
    },
  };
}
