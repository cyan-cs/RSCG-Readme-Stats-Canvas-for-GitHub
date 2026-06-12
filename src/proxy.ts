import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isEditor = req.nextUrl.pathname === "/";
  const isE2ETest =
    process.env.NODE_ENV !== "production" &&
    process.env.E2E_BYPASS_AUTH === "true";

  // Only protect the editor page (root)
  if (isEditor && !isLoggedIn && !isE2ETest) {
    return Response.redirect(new URL("/login", req.nextUrl.origin));
  }
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png).*)",
  ],
};
