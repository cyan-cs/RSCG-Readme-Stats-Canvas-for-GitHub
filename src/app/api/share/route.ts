import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { cardConfigSchema } from "@/lib/validation";
import {
  consumeRateLimit,
  getSharedTemplate,
  saveSharedTemplate,
} from "@/lib/storage";
import { BodyTooLargeError, readLimitedTextBody } from "@/lib/request-body";

const SHARED_MAX = 1000;
const MAX_BODY_SIZE = 50_000; // 50KB max config size

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const PUBLIC_APP_URL = "https://rscg.cy-an.net/";

/** POST — save current config and return a shareable URL */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitSubject = session.user.username || session.user.email;
  if (!rateLimitSubject) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
  if (
    !(await consumeRateLimit(
      "share:create",
      rateLimitSubject,
      RATE_LIMIT_WINDOW_MS,
      RATE_LIMIT_MAX,
    ))
  ) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const text = await readLimitedTextBody(request, MAX_BODY_SIZE);
    const body = JSON.parse(text);
    const parsed = cardConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid config", details: parsed.error.issues },
        { status: 422 },
      );
    }
    const hash = randomBytes(16).toString("base64url");

    // Store with 30-day expiry
    await saveSharedTemplate(
      hash,
      parsed.data,
      Date.now() + 30 * 24 * 3600_000,
      SHARED_MAX,
    );

    const shareUrl = new URL(PUBLIC_APP_URL);
    shareUrl.searchParams.set("template", hash);
    return NextResponse.json({ url: shareUrl.toString() });
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return NextResponse.json({ error: "Config too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/** GET — retrieve a shared template by hash */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hash = searchParams.get("template");
  if (!hash)
    return NextResponse.json(
      { error: "Missing template parameter" },
      { status: 400 },
    );
  if (!/^[A-Za-z0-9_-]{22}$/.test(hash)) {
    return NextResponse.json(
      { error: "Invalid template parameter" },
      { status: 400 },
    );
  }

  const config = await getSharedTemplate(hash);
  if (!config) {
    return NextResponse.json(
      { error: "Template not found or expired" },
      { status: 404 },
    );
  }

  return NextResponse.json(config, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
