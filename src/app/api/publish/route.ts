import { NextRequest, NextResponse } from "next/server";
import { saveCardConfig } from "@/lib/storage";
import { auth } from "@/auth";
import { cardConfigSchema } from "@/lib/validation";
import { BodyTooLargeError, readLimitedTextBody } from "@/lib/request-body";

const MAX_BODY_SIZE = 50_000;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = session.user.username;
  if (!username) {
    return NextResponse.json(
      { error: "No GitHub username found in session" },
      { status: 400 },
    );
  }

  try {
    const text = await readLimitedTextBody(request, MAX_BODY_SIZE);
    const config = JSON.parse(text);

    // Zod validation
    const parsed = cardConfigSchema.safeParse(config);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid config", details: parsed.error.issues },
        { status: 422 },
      );
    }

    // Enforce that users can only publish for their own username
    const securedConfig = {
      ...parsed.data,
      username: username,
    };

    await saveCardConfig(securedConfig);
    return NextResponse.json({ success: true, username });
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return NextResponse.json({ error: "Config too large" }, { status: 413 });
    }
    console.error("Publish error:", error);
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500 },
    );
  }
}
