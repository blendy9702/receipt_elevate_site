import { EXTERNAL_API } from "@/lib/external-api";
import { proxyJson } from "@/lib/proxy-response";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  return proxyJson(
    `${EXTERNAL_API.notificationsReadBase}/${encodeURIComponent(id)}/read`,
    {
      method: "POST",
      body,
      errorMessage: "알림을 읽음 처리하지 못했습니다.",
    },
  );
}
