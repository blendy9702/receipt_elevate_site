import { NextResponse } from "next/server";
import { buildProxyAuthHeaders } from "@/lib/proxy-auth";
import { EXTERNAL_API } from "@/lib/external-api";

type ProxyOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  errorMessage: string;
};

export async function proxyJson(
  upstreamUrl: string,
  options: ProxyOptions,
) {
  try {
    const auth = await buildProxyAuthHeaders();
    if (!auth.ok) {
      return NextResponse.json({ detail: auth.detail }, { status: auth.status });
    }

    const res = await fetch(upstreamUrl, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...auth.headers,
      },
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error(`[proxy] ${upstreamUrl}:`, error);
    return NextResponse.json(
      { detail: options.errorMessage },
      { status: 502 },
    );
  }
}

export function withSearchParams(request: Request, baseUrl: string) {
  const source = new URL(request.url);
  const target = new URL(baseUrl);
  source.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });
  return target.toString();
}

export async function proxyRequest(request: Request, path: string[]) {
  const auth = await buildProxyAuthHeaders();
  if (!auth.ok) {
    return NextResponse.json({ detail: auth.detail }, { status: auth.status });
  }

  const incoming = new URL(request.url);
  const upstream = new URL(
    `${EXTERNAL_API.internalBase}/api/${path.map(encodeURIComponent).join("/")}`,
  );
  incoming.searchParams.forEach((value, key) => {
    upstream.searchParams.append(key, value);
  });

  const headers = new Headers(auth.headers);
  const contentType = request.headers.get("content-type");
  const method = request.method.toUpperCase();
  let body: ArrayBuffer | string | undefined;
  if (method !== "GET" && method !== "HEAD") {
    if (contentType?.includes("multipart/form-data")) {
      body = await request.arrayBuffer();
      if (contentType) headers.set("content-type", contentType);
    } else if (contentType?.includes("application/json")) {
      headers.set("content-type", "application/json");
      body = await request.text();
    } else {
      body = await request.arrayBuffer();
      if (contentType) headers.set("content-type", contentType);
    }
  }

  try {
    const res = await fetch(upstream, {
      method,
      headers,
      body,
      cache: "no-store",
    });
    const resType = res.headers.get("content-type") || "";
    if (resType.includes("application/json") || resType.includes("text/")) {
      const data = resType.includes("application/json")
        ? await res.json().catch(() => ({}))
        : await res.text();
      return NextResponse.json(
        typeof data === "string" ? { detail: data } : data,
        { status: res.status },
      );
    }
    const buffer = await res.arrayBuffer();
    const response = new NextResponse(buffer, { status: res.status });
    if (resType) response.headers.set("content-type", resType);
    const disposition = res.headers.get("content-disposition");
    if (disposition) response.headers.set("content-disposition", disposition);
    return response;
  } catch (error) {
    console.error(`[proxyRequest] ${upstream}:`, error);
    return NextResponse.json(
      { detail: "요청을 처리하지 못했습니다." },
      { status: 502 },
    );
  }
}
