import { EXTERNAL_API } from "@/lib/external-api";
import { proxyJson } from "@/lib/proxy-response";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return proxyJson(EXTERNAL_API.ticketsTransfer, {
    method: "POST",
    body,
    errorMessage: "이용권 이동에 실패했습니다.",
  });
}
