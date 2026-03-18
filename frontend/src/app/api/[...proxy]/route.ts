// frontend/src/app/api/[...proxy]/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.INTERNAL_API_URL ?? "http://nginx";

async function handler(request: NextRequest, segments: string[]): Promise<NextResponse> {
  const path = segments.join("/");
  const target = `${API_URL}/${path}${request.nextUrl.search}`;
  const auth = request.headers.get("authorization");

  try {
    const response = await fetch(target, {
      method: request.method,
      headers: {
        "content-type": request.headers.get("content-type") ?? "application/json",
        ...(auth ? { authorization: auth } : {}),
      },
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.text(),
      cache: "no-store",
    });

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json({ detail: "Proxy request failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest, context: { params: { proxy: string[] } }): Promise<NextResponse> {
  return handler(request, context.params.proxy);
}

export async function POST(request: NextRequest, context: { params: { proxy: string[] } }): Promise<NextResponse> {
  return handler(request, context.params.proxy);
}

export async function PUT(request: NextRequest, context: { params: { proxy: string[] } }): Promise<NextResponse> {
  return handler(request, context.params.proxy);
}

export async function PATCH(request: NextRequest, context: { params: { proxy: string[] } }): Promise<NextResponse> {
  return handler(request, context.params.proxy);
}

export async function DELETE(request: NextRequest, context: { params: { proxy: string[] } }): Promise<NextResponse> {
  return handler(request, context.params.proxy);
}
