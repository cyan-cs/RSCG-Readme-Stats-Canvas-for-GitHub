import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { generateSVG, CardConfig } from "@/lib/svg-engine";
import { getCardConfig } from "@/lib/storage";
import { fetchGitHubStats, GitHubStats } from "@/lib/github-api";
import { cardConfigSchema } from "@/lib/validation";
import { auth } from "@/auth";
import { formatTranslation, resolveLocale, resolveSvgLocale } from "@/i18n";

const CACHE_SECONDS = 60;
const CDN_CACHE_SECONDS = 300;
const STATS_TTL_MS = 30_000;
const SVG_CACHE_MAX = 500; // max SVG cache entries
const STATS_CACHE_MAX = 200; // max stats cache entries
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const GITHUB_USERNAME_PATTERN =
  /^(?!.*--)[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

const svgCache = new Map<string, { hash: string; svg: string; at: number }>();
const statsCache = new Map<
  string,
  { expiresAt: number; stats: GitHubStats | null }
>();
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/** Periodic cleanup of stale SVG cache entries (every 5 minutes) */
const CACHE_CLEANUP_INTERVAL_MS = 300_000;
const CACHE_MAX_AGE_MS = 600_000; // entries older than 10 minutes are evicted

function cleanupSvgCache(): void {
  const now = Date.now();
  // Remove expired entries
  for (const [key, entry] of svgCache) {
    if (now - entry.at > CACHE_MAX_AGE_MS) {
      svgCache.delete(key);
    }
  }
  // Enforce max size (evict oldest if over limit)
  if (svgCache.size > SVG_CACHE_MAX) {
    const sorted = [...svgCache.entries()].sort((a, b) => a[1].at - b[1].at);
    const toDelete = sorted.slice(0, sorted.length - SVG_CACHE_MAX);
    for (const [key] of toDelete) svgCache.delete(key);
  }
  for (const [key, entry] of rateLimitMap) {
    if (entry.resetAt <= now) rateLimitMap.delete(key);
  }
}

// Start periodic cleanup (only in server context, not edge)
if (typeof setInterval !== "undefined") {
  setInterval(cleanupSvgCache, CACHE_CLEANUP_INTERVAL_MS);
}

// Deduplicate concurrent fetches for the same username
const pendingFetches = new Map<string, Promise<GitHubStats | null>>();

async function getCachedGitHubStats(
  username: string,
): Promise<GitHubStats | null> {
  const cached = statsCache.get(username);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.stats;
  }

  // Deduplicate concurrent requests for the same username
  const pending = pendingFetches.get(username);
  if (pending) return pending;

  const promise = (async () => {
    try {
      // Enforce max stats cache size before adding
      if (statsCache.size >= STATS_CACHE_MAX) {
        const oldest = [...statsCache.entries()].sort(
          (a, b) => a[1].expiresAt - b[1].expiresAt,
        )[0];
        if (oldest) statsCache.delete(oldest[0]);
      }

      const stats = await fetchGitHubStats(username);
      statsCache.set(username, {
        expiresAt: Date.now() + STATS_TTL_MS,
        stats,
      });
      return stats;
    } finally {
      pendingFetches.delete(username);
    }
  })();

  pendingFetches.set(username, promise);
  return promise;
}

function createEtag(
  config: CardConfig,
  stats: GitHubStats | null,
  representation: "html" | "svg",
  locale: string,
): string {
  const hash = createHash("sha256")
    .update(JSON.stringify({ config, stats, representation, locale }))
    .digest("base64url");
  return `"${hash}"`;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function hasFreshStatsCache(username: string): boolean {
  const cached = statsCache.get(username);
  return Boolean(cached && cached.expiresAt > Date.now());
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function serializeJsonForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function variantHeaders(
  contentType: string,
  etag?: string,
): Record<string, string> {
  return {
    "Content-Type": contentType,
    "Cache-Control": `public, max-age=${CACHE_SECONDS}, s-maxage=${CDN_CACHE_SECONDS}`,
    Vary: "Accept, Accept-Language",
    "X-Content-Type-Options": "nosniff",
    ...(etag ? { ETag: etag } : {}),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  if (!GITHUB_USERNAME_PATTERN.test(username)) {
    return NextResponse.json(
      { error: "Invalid GitHub username" },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const isRaw = searchParams.get("raw") === "true";

  if (isRaw) {
    const session = await auth();
    if (
      !session?.user?.username ||
      session.user.username.toLowerCase() !== username.toLowerCase()
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const config = await getCardConfig(session.user.username);
    if (!config)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(config, {
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  if (!hasFreshStatsCache(username) && !checkRateLimit(getClientIp(request))) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  // Fetch public data only after validation and rate limiting.
  const [stats, storedConfig] = await Promise.all([
    getCachedGitHubStats(username),
    getCardConfig(username),
  ]);
  const parsedConfig = storedConfig
    ? cardConfigSchema.safeParse(storedConfig)
    : null;
  const config = parsedConfig?.success ? parsedConfig.data : null;

  // Clamp card dimensions for stability
  if (config) {
    config.width = Math.min(Math.max(config.width || 495, 100), 1200);
    config.height = Math.min(Math.max(config.height || 200, 50), 800);
  }

  // Fallback to default card if no saved config
  const finalConfig: CardConfig = config || {
    username,
    bgColor: "#0d1117",
    borderColor: "#30363d",
    width: 495,
    height: 200,
    elements: [
      {
        id: "1",
        type: "text",
        x: 24,
        y: 45,
        text: `${username}'s Stats`,
        fontSize: 22,
        visible: true,
        color: "#58a6ff",
      },
      {
        id: "2",
        type: "stats",
        x: 24,
        y: 90,
        fontSize: 14,
        visible: true,
        color: "#ffffff",
      },
      {
        id: "3",
        type: "languages",
        x: 24,
        y: 160,
        visible: true,
        color: "#ffffff",
      },
    ],
  };

  const acceptLang = request.headers.get("accept-language") || "";
  const accept = request.headers.get("accept") || "";
  const locale = resolveLocale(acceptLang);
  const svgLocale = resolveSvgLocale(acceptLang);
  const representation = accept.includes("text/html") ? "html" : "svg";
  const representationLocale = representation === "svg" ? svgLocale : locale;
  const etag = createEtag(
    finalConfig,
    stats,
    representation,
    representationLocale,
  );
  const cacheKey = `${username}:${svgLocale}`;
  const cachedSvg = svgCache.get(cacheKey);

  // 304 Not Modified
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ...variantHeaders(
          representation === "html"
            ? "text/html; charset=utf-8"
            : "image/svg+xml; charset=utf-8",
          etag,
        ),
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Serve HTML page for browser requests (SEO / OGP)
  if (representation === "html") {
    const cardUrl = `${request.nextUrl.origin}/${encodeURIComponent(username)}`;
    const title = `${username}'s GitHub Stats Card`;
    const description = formatTranslation(locale, "publicCard.description", {
      username,
    });
    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const safeCardUrl = escapeHtml(cardUrl);
    const safeUsername = escapeHtml(username);
    const html = `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width"/>
<title>${safeTitle}</title>
<meta name="description" content="${safeDescription}"/>
<meta property="og:title" content="${safeTitle}"/>
<meta property="og:description" content="${safeDescription}"/>
<meta property="og:type" content="profile"/>
<meta property="og:image" content="${safeCardUrl}"/>
<meta property="og:url" content="${safeCardUrl}"/>
<meta name="twitter:card" content="summary_large_image"/>
<script type="application/ld+json">${serializeJsonForHtml({
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      name: username,
      description,
      mainEntity: { "@type": "Person", name: username },
      image: cardUrl,
    })}</script>
</head>
<body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0d1117">
<img src="${safeCardUrl}" alt="${safeUsername}&#39;s GitHub stats card" style="max-width:100%"/>
</body>
</html>`;
    return new NextResponse(html, {
      headers: variantHeaders("text/html; charset=utf-8", etag),
    });
  }

  // Generate SVG (reuse if hash matches)
  const svg =
    cachedSvg?.hash === etag
      ? cachedSvg.svg
      : generateSVG(finalConfig, stats, svgLocale);
  if (cachedSvg?.hash !== etag) {
    svgCache.set(cacheKey, { hash: etag, svg, at: Date.now() });
  }

  return new NextResponse(svg, {
    headers: {
      ...variantHeaders("image/svg+xml; charset=utf-8", etag),
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// Handle CORS preflight for cross-origin <img> requests
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}
