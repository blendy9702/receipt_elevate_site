import { proxyRequest } from "@/lib/proxy-response";

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(request: Request, context: Ctx) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
