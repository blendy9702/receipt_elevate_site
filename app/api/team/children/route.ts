import { EXTERNAL_API } from "@/lib/external-api";
import { proxyJson } from "@/lib/proxy-response";

export async function GET() {
  return proxyJson(EXTERNAL_API.parentChildren, {
    errorMessage: "하위 계정 목록을 불러오지 못했습니다.",
  });
}
