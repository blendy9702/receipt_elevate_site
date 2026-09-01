import { EXTERNAL_API } from "@/lib/external-api";
import { proxyJson } from "@/lib/proxy-response";

type Ctx = { params: Promise<{ userId: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { userId } = await context.params;
  return proxyJson(
    `${EXTERNAL_API.ticketsBalance}/${encodeURIComponent(userId)}`,
    { errorMessage: "계정 이용권을 불러오지 못했습니다." },
  );
}
