import { NextRequest, NextResponse } from "next/server";

function isLocalUrl(value: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(value);
}

function getBackendApiUrl(): string {
  const configured = (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/+$/, "");
  if (!configured) {
    return "";
  }
  if (process.env.NODE_ENV === "production" && isLocalUrl(configured)) {
    return "";
  }
  return configured;
}

async function proxyRequest(
  request: NextRequest,
  context: { params: { path?: string[] } }
): Promise<NextResponse> {
  const backendApiUrl = getBackendApiUrl();
  if (!backendApiUrl) {
    return NextResponse.json(
      {
        detail: {
          code: "BACKEND_API_URL_MISSING",
          message: "Backend API URL is not configured. Set BACKEND_API_URL in Vercel to your Render backend URL."
        }
      },
      { status: 500 }
    );
  }

  const path = context.params.path?.join("/") ?? "";
  const targetUrl = `${backendApiUrl}/${path}${request.nextUrl.search}`;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const authorization = request.headers.get("authorization");

  if (contentType) {
    headers.set("content-type", contentType);
  }
  if (authorization) {
    headers.set("authorization", authorization);
  }

  const method = request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  try {
    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual"
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    return NextResponse.json(
      {
        detail: {
          code: "BACKEND_API_UNREACHABLE",
          message: `Could not reach the Render backend. ${error instanceof Error ? error.message : "Unknown network error."}`
        }
      },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
