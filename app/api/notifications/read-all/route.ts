import { EXTERNAL_API } from "@/lib/external-api";
import { proxyJson } from "@/lib/proxy-response";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({ unread_only: true }));
  return proxyJson(EXTERNAL_API.notificationsReadAll, {
    method: "POST",
    body,
    errorMessage: "알림을 모두 읽음 처리하지 못했습니다.",
  });
}
