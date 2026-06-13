import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { resolveLocale } from "@/i18n";
import { buildLoginCallbackUrl } from "@/lib/navigation";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname, search } = req.nextUrl;
  const isEditor = pathname === "/editor";
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    req.nextUrl.host;
  const protocol =
    req.headers.get("x-forwarded-proto") ||
    req.nextUrl.protocol.replace(":", "");
  const requestOrigin = `${protocol}://${host}`;
  const isE2ETest =
    process.env.NODE_ENV !== "production" &&
    process.env.E2E_BYPASS_AUTH === "true";

  if (pathname === "/") {
    const locale = resolveLocale(req.headers.get("accept-language"));
    const response = NextResponse.redirect(
      new URL(`/${locale}`, requestOrigin),
      307,
    );
    response.headers.set("Vary", "Accept-Language");
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  if (isEditor && !isLoggedIn && !isE2ETest) {
    const loginUrl = new URL("/login", requestOrigin);
    loginUrl.searchParams.set(
      "callbackUrl",
      buildLoginCallbackUrl(pathname, search),
    );
    return NextResponse.redirect(loginUrl);
  }

  const requestHeaders = new Headers(req.headers);
  const pathLocale = pathname.match(/^\/(en|ja|ko|zh)(?:\/|$)/)?.[1];
  requestHeaders.set(
    "x-rscg-locale",
    pathLocale || resolveLocale(req.headers.get("accept-language")),
  );
  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png).*)",
  ],
};
