import { NextRequest, NextResponse } from "next/server";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("src");
  if (!source) {
    return NextResponse.json(
      { error: "Missing avatar source" },
      { status: 400 },
    );
  }

  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return NextResponse.json(
      { error: "Invalid avatar source" },
      { status: 400 },
    );
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "avatars.githubusercontent.com"
  ) {
    return NextResponse.json(
      { error: "Avatar source is not allowed" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "ProfileCanvas" },
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: "Avatar unavailable" },
        { status: 502 },
      );
    }

    const contentType =
      response.headers.get("content-type")?.split(";")[0] || "";
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (
      !ALLOWED_CONTENT_TYPES.has(contentType) ||
      (contentLength > 0 && contentLength > MAX_AVATAR_BYTES)
    ) {
      return NextResponse.json(
        { error: "Invalid avatar response" },
        { status: 502 },
      );
    }

    const body = await response.arrayBuffer();
    if (body.byteLength > MAX_AVATAR_BYTES) {
      return NextResponse.json({ error: "Avatar too large" }, { status: 502 });
    }

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Avatar request failed" },
      { status: 502 },
    );
  }
}
