import { EXTERNAL_API } from "@/lib/external-api";
import { proxyJson, withSearchParams } from "@/lib/proxy-response";

export async function GET(request: Request) {
  return proxyJson(withSearchParams(request, EXTERNAL_API.ticketsLedger), {
    errorMessage: "이용권 사용 내역을 불러오지 못했습니다.",
  });
}
