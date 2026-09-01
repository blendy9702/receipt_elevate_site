import { EXTERNAL_API } from "@/lib/external-api";
import { proxyJson } from "@/lib/proxy-response";

export async function GET() {
  return proxyJson(`${EXTERNAL_API.hiddenPlacesUser}/init`, {
    errorMessage: "플레이스 표시 설정을 불러오지 못했습니다.",
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return proxyJson(`${EXTERNAL_API.hiddenPlacesUser}/save`, {
    method: "POST",
    body,
    errorMessage: "플레이스 표시 설정을 저장하지 못했습니다.",
  });
}
