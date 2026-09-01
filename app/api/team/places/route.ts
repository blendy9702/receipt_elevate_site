import { EXTERNAL_API } from "@/lib/external-api";
import { proxyJson, withSearchParams } from "@/lib/proxy-response";

export async function GET(request: Request) {
  const source = new URL(request.url);
  const username = source.searchParams.get("username");
  const target = username
    ? withSearchParams(request, EXTERNAL_API.parentChildAssignedPlaces)
    : EXTERNAL_API.parentAllowedPlaces;

  return proxyJson(target, {
    errorMessage: "배정 플레이스 정보를 불러오지 못했습니다.",
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return proxyJson(EXTERNAL_API.parentSaveChildAssignedPlaces, {
    method: "POST",
    body,
    errorMessage: "플레이스 배정을 저장하지 못했습니다.",
  });
}
